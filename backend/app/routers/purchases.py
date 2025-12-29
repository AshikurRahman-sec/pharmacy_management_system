from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from .. import crud, schemas, models
from ..dependencies import get_db
from ..auth import get_current_active_user

router = APIRouter()


class PaidAmountUpdate(BaseModel):
    paid_amount: float


@router.post("/purchases/", response_model=schemas.Purchase)
def create_purchase(
    purchase: schemas.PurchaseCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return crud.create_purchase(db=db, purchase=purchase, user_id=current_user.id)

@router.get("/purchases/", response_model=List[schemas.Purchase])
def read_purchases(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    purchases = crud.get_purchases(db, skip=skip, limit=limit)
    return purchases

@router.put("/purchases/{purchase_id}/paid", response_model=schemas.Purchase)
def update_paid_amount(
    purchase_id: int, 
    data: PaidAmountUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        from fastapi import status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update payment status")
    
    db_purchase = db.query(models.Purchase).filter(models.Purchase.id == purchase_id).first()
    if not db_purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    db_purchase.paid_amount = data.paid_amount
    
    # Update payment status
    net_amount = db_purchase.total_amount - (db_purchase.invoice_discount or 0)
    if db_purchase.paid_amount >= net_amount:
        db_purchase.payment_status = "paid"
    elif db_purchase.paid_amount > 0:
        db_purchase.payment_status = "partial"
    else:
        db_purchase.payment_status = "unpaid"
    
    db.commit()
    db.refresh(db_purchase)
    return db_purchase
