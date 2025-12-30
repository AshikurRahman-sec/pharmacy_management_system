from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from .. import crud, schemas, models
from ..dependencies import get_db
from ..auth import get_current_active_user

router = APIRouter(
    prefix="/add_purchase",
    tags=["add_purchase"],
)


@router.get("/next_invoice_number")
def get_next_invoice_number(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    today = date.today()
    # Format: YYYY-MM-
    prefix = f"{today.year}-{today.month:02d}-"
    
    # Get all invoices starting with this prefix
    purchases = db.query(models.Purchase).filter(
        models.Purchase.invoice_number.like(f"{prefix}%")
    ).all()
    
    if not purchases:
        next_seq = 0
    else:
        max_seq = 0
        for p in purchases:
            try:
                if not p.invoice_number:
                    continue
                # Extract the part after the prefix
                part = p.invoice_number[len(prefix):]
                if part.isdigit():
                    seq = int(part)
                    if seq > max_seq:
                        max_seq = seq
            except ValueError:
                continue
        next_seq = max_seq + 1
    
    # Padded to at least 2 digits (e.g., 00, 01)
    invoice_number = f"{prefix}{next_seq:02d}"
    
    return {"invoice_number": invoice_number}


@router.get("/check/{invoice_number}")
def check_invoice_exists(
    invoice_number: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    db_purchase = db.query(models.Purchase).filter(
        models.Purchase.invoice_number == invoice_number
    ).first()
    
    if db_purchase:
        return {
            "exists": True,
            "purchase_date": db_purchase.purchase_date,
            "supplier_name": db_purchase.supplier_name,
            "invoice_discount": db_purchase.invoice_discount,
            "paid_amount": db_purchase.paid_amount,
            "payment_status": db_purchase.payment_status
        }
    return {"exists": False}


@router.post("/", response_model=schemas.Purchase)
def create_purchase_invoice(
    invoice: schemas.PurchaseInvoiceCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        from fastapi import status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add stock/purchases")
    
    # Get or create Purchase record
    db_purchase = db.query(models.Purchase).filter(
        models.Purchase.invoice_number == invoice.invoice_number
    ).first()

    if not db_purchase:
        db_purchase = models.Purchase(
            supplier_name=invoice.supplier_name,
            invoice_number=invoice.invoice_number,
            purchase_date=invoice.purchase_date,
            total_amount=0,
            invoice_discount=invoice.invoice_discount,
            discount_type=invoice.discount_type,
            paid_amount=invoice.paid_amount,
            payment_status="unpaid"
        )
        db.add(db_purchase)
        db.commit()
        db.refresh(db_purchase)
    else:
        db_purchase.invoice_discount = invoice.invoice_discount
        db_purchase.discount_type = invoice.discount_type
        db_purchase.paid_amount = invoice.paid_amount

    total_invoice_amount = db_purchase.total_amount

    for item in invoice.items:
        medicine_id = item.medicine_id

        # Handle Medicine Creation / Update
        if item.medicine_name:
            medicine_in_db = crud.get_medicine_by_name(db, name=item.medicine_name)
            if medicine_in_db:
                medicine_id = medicine_in_db.id
                medicine_in_db.purchase_price = item.medicine_purchase_price
                medicine_in_db.selling_price = item.medicine_selling_price
                medicine_in_db.generic_name = item.generic_name
                medicine_in_db.manufacturer = item.manufacturer
                medicine_in_db.strength = item.strength
                medicine_in_db.medicine_type = item.medicine_type
            else:
                new_medicine_data = schemas.MedicineCreate(
                    name=item.medicine_name,
                    generic_name=item.generic_name,
                    manufacturer=item.manufacturer,
                    strength=item.strength,
                    medicine_type=item.medicine_type,
                    purchase_price=item.medicine_purchase_price,
                    selling_price=item.medicine_selling_price
                )
                medicine = crud.create_medicine(db=db, medicine=new_medicine_data)
                medicine_id = medicine.id
        elif medicine_id:
            medicine_in_db = crud.get_medicine(db, medicine_id=medicine_id)
            if medicine_in_db:
                medicine_in_db.purchase_price = item.medicine_purchase_price
                medicine_in_db.selling_price = item.medicine_selling_price
                # Update existing medicine details if provided
                if item.generic_name: medicine_in_db.generic_name = item.generic_name
                if item.manufacturer: medicine_in_db.manufacturer = item.manufacturer
                if item.strength: medicine_in_db.strength = item.strength
                if item.medicine_type: medicine_in_db.medicine_type = item.medicine_type

        # Create Medicine Batch
        batch_data = schemas.MedicineBatchCreate(
            medicine_id=medicine_id,
            supplier_name=invoice.supplier_name,
            batch_quantity=item.quantity,
            unit_id=item.unit_id,
            per_product_discount=item.per_product_discount,
            discount_type=item.discount_type,
            invoice_number=invoice.invoice_number,
            expiry_date=item.expiry_date,
            purchase_date=invoice.purchase_date,
            total_batch_discount=item.total_batch_discount,
            selling_price=item.medicine_selling_price # Saving selling price to batch
        )
        crud.create_medicine_batch(db=db, batch=batch_data)
        db.add(db_item)
        total_invoice_amount += (item.quantity * item.medicine_purchase_price)

    # Update totals and payment status
    db_purchase.total_amount = total_invoice_amount
    net_amount = total_invoice_amount - db_purchase.invoice_discount
    
    if db_purchase.paid_amount >= net_amount:
        db_purchase.payment_status = "paid"
    elif db_purchase.paid_amount > 0:
        db_purchase.payment_status = "partial"
    else:
        db_purchase.payment_status = "unpaid"

    db.commit()
    db.refresh(db_purchase)
    return db_purchase
