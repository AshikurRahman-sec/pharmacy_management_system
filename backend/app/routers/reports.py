from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date, timedelta
from sqlalchemy import func, and_, extract
from .. import models
from ..dependencies import get_db

from ..auth import get_current_active_user

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
)

@router.get("/summary/")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    today = date.today()
    
    total_medicines = db.query(models.Medicine).count()
    total_sales_today = db.query(func.sum(models.Sale.total_amount)).filter(models.Sale.sale_date == today).scalar() or 0.0
    total_due = db.query(func.sum(models.Sale.due_amount)).scalar() or 0.0
    
    # Low stock alert (e.g. stock < 10)
    low_stock_medicines = db.query(models.Medicine).filter(models.Medicine.stock_quantity < 10).all()
    low_stock_count = len(low_stock_medicines)
    
    # Expiry alerts - medicines expiring in 30, 60, 90 days
    expiry_30_days = today + timedelta(days=30)
    expiry_60_days = today + timedelta(days=60)
    expiry_90_days = today + timedelta(days=90)
    
    # Get batches expiring soon (within 90 days) that still have quantity
    expiring_batches = db.query(models.MedicineBatch).join(models.Medicine).filter(
        and_(
            models.MedicineBatch.expiry_date <= expiry_90_days,
            models.MedicineBatch.expiry_date >= today,
            models.MedicineBatch.batch_quantity > 0
        )
    ).all()
    
    # Get already expired batches
    expired_batches = db.query(models.MedicineBatch).join(models.Medicine).filter(
        and_(
            models.MedicineBatch.expiry_date < today,
            models.MedicineBatch.batch_quantity > 0
        )
    ).all()
    
    # Categorize expiring medicines
    expiring_soon = []  # Within 30 days
    expiring_medium = []  # 30-60 days
    expiring_later = []  # 60-90 days
    
    for batch in expiring_batches:
        item = {
            "medicine_name": batch.medicine.name,
            "batch_quantity": batch.batch_quantity,
            "expiry_date": batch.expiry_date.isoformat(),
            "days_left": (batch.expiry_date - today).days,
            "invoice_number": batch.invoice_number
        }
        if batch.expiry_date <= expiry_30_days:
            expiring_soon.append(item)
        elif batch.expiry_date <= expiry_60_days:
            expiring_medium.append(item)
        else:
            expiring_later.append(item)
    
    expired_items = [
        {
            "medicine_name": batch.medicine.name,
            "batch_quantity": batch.batch_quantity,
            "expiry_date": batch.expiry_date.isoformat(),
            "days_expired": (today - batch.expiry_date).days,
            "invoice_number": batch.invoice_number
        } for batch in expired_batches
    ]
    
    # Recent 5 sales
    recent_sales = db.query(models.Sale).order_by(models.Sale.id.desc()).limit(5).all()
    
    # Supplier dues (unpaid purchases)
    supplier_dues = db.query(models.Purchase).filter(models.Purchase.payment_status != "paid").all()
    total_supplier_due = sum(
        max(0, (p.total_amount - (p.invoice_discount or 0)) - (p.paid_amount or 0)) 
        for p in supplier_dues
    )
    
    return {
        "total_medicines": total_medicines,
        "total_sales_today": total_sales_today,
        "total_due": total_due,
        "total_supplier_due": total_supplier_due,
        "low_stock_count": low_stock_count,
        "low_stock_medicines": [
            {
                "id": med.id,
                "name": med.name,
                "stock_quantity": med.stock_quantity,
                "selling_price": med.selling_price
            } for med in low_stock_medicines
        ],
        "expiry_alerts": {
            "expired_count": len(expired_items),
            "expired_items": expired_items,
            "expiring_30_days": expiring_soon,
            "expiring_60_days": expiring_medium,
            "expiring_90_days": expiring_later,
            "total_expiring_soon": len(expiring_soon) + len(expired_items)
        },
        "recent_sales": [
            {
                "id": sale.id,
                "date": sale.sale_date,
                "buyer": sale.buyer_name or "Cash",
                "total": sale.total_amount,
                "due": sale.due_amount
            } for sale in recent_sales
        ]
    }

@router.get("/profit-loss/")
def get_profit_loss(
    start_date: date, 
    end_date: date, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view profit/loss reports")
    
    sales = db.query(models.Sale).filter(models.Sale.sale_date.between(start_date, end_date)).all()
    salaries = db.query(models.EmployeeBill).filter(models.EmployeeBill.payment_date.between(start_date, end_date)).all()
    expenses = db.query(models.Expense).filter(models.Expense.expense_date.between(start_date, end_date)).all()

    total_revenue = sum(sale.total_amount for sale in sales)
    total_sales_cash = sum(sale.amount_paid for sale in sales)
    total_sales_due = sum(sale.due_amount for sale in sales)
    
    total_employee_costs = sum(bill.total_amount for bill in salaries)
    total_other_expenses = sum(exp.amount for exp in expenses)
    
    # Calculate Cost of Goods Sold (COGS)
    total_cogs = 0
    for sale in sales:
        for item in sale.items:
            total_cogs += (item.quantity * item.medicine.purchase_price)

    profit = total_revenue - total_cogs - total_employee_costs - total_other_expenses

    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_revenue": total_revenue,
        "total_sales_cash": total_sales_cash,
        "total_sales_due": total_sales_due,
        "total_cogs": total_cogs,
        "total_employee_costs": total_employee_costs,
        "total_other_expenses": total_other_expenses,
        "profit": profit
    }

@router.get("/customer-dues/")
def get_customer_dues(
    month: int = None,
    year: int = None,
    status: str = "all", # all, due, paid
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view due reports")

    query = db.query(models.Sale)

    if month and year:
        query = query.filter(extract('month', models.Sale.sale_date) == month)
        query = query.filter(extract('year', models.Sale.sale_date) == year)
    elif year:
        query = query.filter(extract('year', models.Sale.sale_date) == year)

    if status == "due":
        query = query.filter(models.Sale.due_amount > 0)
    elif status == "paid":
        query = query.filter(models.Sale.due_amount == 0)

    sales = query.all()
    
    return [
        {
            "id": sale.id,
            "date": sale.sale_date,
            "customer_name": sale.buyer_name or "Cash Customer",
            "customer_mobile": sale.buyer_mobile,
            "total_amount": sale.total_amount,
            "paid_amount": sale.amount_paid,
            "due_amount": sale.due_amount
        } for sale in sales
    ]

@router.get("/supplier-dues/")
def get_supplier_dues(
    month: int = None,
    year: int = None,
    status: str = "all", # all, due, paid
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view due reports")

    query = db.query(models.Purchase)

    if month and year:
        query = query.filter(extract('month', models.Purchase.purchase_date) == month)
        query = query.filter(extract('year', models.Purchase.purchase_date) == year)
    elif year:
        query = query.filter(extract('year', models.Purchase.purchase_date) == year)

    if status == "due":
        query = query.filter(models.Purchase.payment_status != "paid")
    elif status == "paid":
        query = query.filter(models.Purchase.payment_status == "paid")

    purchases = query.all()
    
    return [
        {
            "id": purchase.id,
            "date": purchase.purchase_date,
            "invoice_number": purchase.invoice_number,
            "supplier_name": purchase.supplier_name,
            "total_amount": purchase.total_amount - (purchase.invoice_discount or 0),
            "paid_amount": purchase.paid_amount,
            "due_amount": max(0, (purchase.total_amount - (purchase.invoice_discount or 0)) - purchase.paid_amount),
            "status": purchase.payment_status
        } for purchase in purchases
    ]
