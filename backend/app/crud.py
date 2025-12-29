import datetime
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from . import models, schemas
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


from sqlalchemy import func

# ==================== Medicine CRUD ====================

def get_medicine(db: Session, medicine_id: int):
    return db.query(models.Medicine).options(
        joinedload(models.Medicine.batches)
    ).filter(models.Medicine.id == medicine_id).first()


def get_medicine_by_name(db: Session, name: str):
    return db.query(models.Medicine).filter(func.lower(models.Medicine.name) == name.lower()).first()


def get_medicines(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Medicine).options(
        joinedload(models.Medicine.batches)
    ).offset(skip).limit(limit).all()


def create_medicine(db: Session, medicine: schemas.MedicineCreate, user_id: int = None):
    db_medicine = models.Medicine(
        name=medicine.name,
        stock_quantity=0,
        purchase_price=medicine.purchase_price,
        selling_price=medicine.selling_price
    )
    db.add(db_medicine)
    db.commit()
    db.refresh(db_medicine)
    
    if user_id:
        create_activity_log(db, user_id, "Created Medicine", f"Created medicine: {medicine.name}")
        
    return db_medicine


def update_medicine(db: Session, medicine_id: int, medicine: schemas.MedicineCreate):
    db_medicine = get_medicine(db, medicine_id)
    if db_medicine:
        for key, value in medicine.dict(exclude_unset=True).items():
            setattr(db_medicine, key, value)
        db.commit()
        db.refresh(db_medicine)
    return db_medicine


def delete_medicine(db: Session, medicine_id: int):
    db_medicine = get_medicine(db, medicine_id)
    if db_medicine:
        db.delete(db_medicine)
        db.commit()
    return db_medicine


# ==================== Medicine Batch CRUD ====================

def get_medicine_batch(db: Session, batch_id: int):
    return db.query(models.MedicineBatch).filter(models.MedicineBatch.id == batch_id).first()


def get_medicine_batches(db: Session, medicine_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    query = db.query(models.MedicineBatch)
    if medicine_id:
        query = query.filter(models.MedicineBatch.medicine_id == medicine_id)
    return query.offset(skip).limit(limit).all()


def create_medicine_batch(db: Session, batch: schemas.MedicineBatchCreate):
    db_batch = models.MedicineBatch(**batch.dict())
    db.add(db_batch)
    
    # Update medicine's stock quantity and purchase_date
    medicine = db.query(models.Medicine).filter(models.Medicine.id == batch.medicine_id).first()
    if medicine:
        medicine.stock_quantity += batch.batch_quantity
        medicine.purchase_date = batch.purchase_date or datetime.date.today()
    
    db.commit()
    db.refresh(db_batch)
    return db_batch


def update_medicine_batch(db: Session, batch_id: int, batch: schemas.MedicineBatchCreate):
    db_batch = get_medicine_batch(db, batch_id)
    if db_batch:
        old_quantity = db_batch.batch_quantity
        for key, value in batch.dict(exclude_unset=True).items():
            setattr(db_batch, key, value)
        
        # Update medicine's stock quantity
        medicine = db.query(models.Medicine).filter(models.Medicine.id == db_batch.medicine_id).first()
        if medicine:
            medicine.stock_quantity += (db_batch.batch_quantity - old_quantity)
        
        db.commit()
        db.refresh(db_batch)
    return db_batch


def delete_medicine_batch(db: Session, batch_id: int):
    db_batch = get_medicine_batch(db, batch_id)
    if db_batch:
        medicine = db.query(models.Medicine).filter(models.Medicine.id == db_batch.medicine_id).first()
        if medicine:
            medicine.stock_quantity -= db_batch.batch_quantity
        
        db.delete(db_batch)
        db.commit()
    return db_batch


# ==================== Purchase CRUD ====================

def get_purchases(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Purchase).options(
        joinedload(models.Purchase.items).joinedload(models.PurchaseItem.medicine)
    ).offset(skip).limit(limit).all()


def create_purchase(db: Session, purchase: schemas.PurchaseCreate, user_id: int = None):
    db_purchase = models.Purchase(
        supplier_name=purchase.supplier_name,
        purchase_date=purchase.purchase_date,
        total_amount=0
    )
    db.add(db_purchase)
    db.commit()
    db.refresh(db_purchase)

    total_amount = 0
    for item_data in purchase.items:
        db_item = models.PurchaseItem(**item_data.dict(), purchase_id=db_purchase.id)
        total_amount += item_data.quantity * item_data.price_at_purchase
        db.add(db_item)
        
        medicine = get_medicine(db, item_data.medicine_id)
        if medicine:
            medicine.stock_quantity += item_data.quantity

    db_purchase.total_amount = total_amount
    db.commit()
    db.refresh(db_purchase)
    
    if user_id:
        create_activity_log(db, user_id, "Created Purchase", f"Invoice: {purchase.invoice_number}, Supplier: {purchase.supplier_name}")
        
    return db_purchase


# ==================== Sale CRUD ====================

def get_sales(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Sale).offset(skip).limit(limit).all()


def create_sale(db: Session, sale: schemas.SaleCreate, user_id: int = None):
    db_sale = models.Sale(
        sale_date=sale.sale_date,
        buyer_name=sale.buyer_name,
        buyer_mobile=sale.buyer_mobile,
        buyer_address=sale.buyer_address,
        amount_paid=sale.amount_paid,
        total_amount=0,
        due_amount=0
    )
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)

    total_amount = 0
    for item_data in sale.items:
        medicine = get_medicine(db, item_data.medicine_id)
        if not medicine or medicine.stock_quantity < item_data.quantity:
            db.delete(db_sale)
            db.commit()
            raise ValueError(f"Not enough stock for medicine {item_data.medicine_id}")

        price_at_sale = medicine.selling_price
        db_item = models.SaleItem(
            **item_data.dict(),
            sale_id=db_sale.id,
            price_at_sale=price_at_sale
        )
        total_amount += item_data.quantity * price_at_sale
        db.add(db_item)
        medicine.stock_quantity -= item_data.quantity

    db_sale.total_amount = total_amount
    db_sale.due_amount = max(0, total_amount - sale.amount_paid)
    db.commit()
    db.refresh(db_sale)
    
    if user_id:
        create_activity_log(db, user_id, "Created Sale", f"Sale ID: {db_sale.id}, Total: {total_amount}")
        
    return db_sale


def update_sale_payment(db: Session, sale_id: int, sale_update: schemas.SaleUpdate):
    db_sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if db_sale:
        db_sale.amount_paid += sale_update.amount_paid
        db_sale.due_amount = max(0, db_sale.total_amount - db_sale.amount_paid)
        db.commit()
        db.refresh(db_sale)
    return db_sale


def delete_sale(db: Session, sale_id: int):
    db_sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if db_sale:
        for item in db_sale.items:
            medicine = db.query(models.Medicine).filter(models.Medicine.id == item.medicine_id).first()
            if medicine:
                medicine.stock_quantity += item.quantity
        db.delete(db_sale)
        db.commit()
    return db_sale


# ==================== Employee CRUD ====================

def get_employees(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Employee).offset(skip).limit(limit).all()


def create_employee(db: Session, employee: schemas.EmployeeCreate):
    db_employee = models.Employee(**employee.dict())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee


def update_employee(db: Session, employee_id: int, employee: schemas.EmployeeCreate):
    db_employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if db_employee:
        for key, value in employee.dict(exclude_unset=True).items():
            setattr(db_employee, key, value)
        db.commit()
        db.refresh(db_employee)
    return db_employee


def delete_employee(db: Session, employee_id: int):
    db_employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if db_employee:
        db.delete(db_employee)
        db.commit()
    return db_employee


# ==================== Employee Bill CRUD ====================

def get_employee_bills(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.EmployeeBill).offset(skip).limit(limit).all()


def create_employee_bill(db: Session, bill: schemas.EmployeeBillCreate):
    total_amount = bill.base_amount + bill.overtime_amount
    db_bill = models.EmployeeBill(**bill.dict(), total_amount=total_amount)
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill


# ==================== Shareholder CRUD ====================

def get_shareholders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Shareholder).offset(skip).limit(limit).all()

def get_shareholder(db: Session, shareholder_id: int):
    return db.query(models.Shareholder).filter(models.Shareholder.id == shareholder_id).first()

def create_shareholder(db: Session, shareholder: schemas.ShareholderCreate):
    db_shareholder = models.Shareholder(**shareholder.dict())
    db.add(db_shareholder)
    db.commit()
    db.refresh(db_shareholder)
    return db_shareholder

# ==================== Investment CRUD ====================

def get_investments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Investment).options(joinedload(models.Investment.shareholder)).offset(skip).limit(limit).all()


def create_investment(db: Session, investment: schemas.InvestmentCreate, user_id: int = None):
    # Logic to handle Shareholder creation from User ID if provided
    final_shareholder_id = investment.shareholder_id
    
    # If a user_id is provided in the investment data (we'll add this to schema next), use it
    if hasattr(investment, 'target_user_id') and investment.target_user_id:
        # Check if shareholder exists for this user
        existing_sh = db.query(models.Shareholder).filter(models.Shareholder.user_id == investment.target_user_id).first()
        if existing_sh:
            final_shareholder_id = existing_sh.id
        else:
            # Create new shareholder profile for this user
            user = get_user(db, investment.target_user_id)
            if user:
                new_sh = models.Shareholder(
                    name=user.username,
                    email=user.email,
                    joined_date=datetime.date.today(),
                    user_id=user.id
                )
                db.add(new_sh)
                db.commit()
                db.refresh(new_sh)
                final_shareholder_id = new_sh.id

    db_investment = models.Investment(
        shareholder_id=final_shareholder_id,
        investor_name=investment.investor_name,
        amount=investment.amount,
        investment_date=investment.investment_date
    )
    db.add(db_investment)
    db.commit()
    db.refresh(db_investment)
    
    if user_id:
        shareholder_name = "Unknown"
        if final_shareholder_id:
            shareholder = get_shareholder(db, final_shareholder_id)
            if shareholder:
                shareholder_name = shareholder.name
        elif investment.investor_name:
            shareholder_name = investment.investor_name
            
        create_activity_log(db, user_id, "Added Investment", f"Amount: {investment.amount}, Investor: {shareholder_name}")
        
    return db_investment

# ==================== Profit Distribution CRUD ====================

def create_profit_distribution(db: Session, distribution: schemas.ProfitDistributionCreate, user_id: int = None):
    db_dist = models.ProfitDistribution(**distribution.dict())
    db.add(db_dist)
    db.commit()
    db.refresh(db_dist)
    
    if user_id:
        shareholder = get_shareholder(db, distribution.shareholder_id)
        name = shareholder.name if shareholder else "ID: " + str(distribution.shareholder_id)
        create_activity_log(db, user_id, "Profit Distributed", f"Amount: {distribution.amount}, Shareholder: {name}")
        
    return db_dist

def get_profit_distributions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.ProfitDistribution).options(joinedload(models.ProfitDistribution.shareholder)).offset(skip).limit(limit).all()


# ==================== User CRUD ====================

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate, actor_user_id: int = None):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    if actor_user_id:
        create_activity_log(db, actor_user_id, "Created User", f"New user: {user.username}, Role: {user.role}")
        
    return db_user


def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
    return db_user


# ==================== Unit CRUD ====================

def get_unit(db: Session, unit_id: int):
    return db.query(models.Unit).filter(models.Unit.id == unit_id).first()


def get_unit_by_name(db: Session, name: str):
    return db.query(models.Unit).filter(models.Unit.name == name).first()


def get_units(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Unit).offset(skip).limit(limit).all()


def create_unit(db: Session, unit: schemas.UnitCreate):
    db_unit = models.Unit(name=unit.name)
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit


def update_unit(db: Session, unit_id: int, unit: schemas.UnitCreate):
    db_unit = get_unit(db, unit_id)
    if db_unit:
        for key, value in unit.dict(exclude_unset=True).items():
            setattr(db_unit, key, value)
        db.commit()
        db.refresh(db_unit)
    return db_unit


def delete_unit(db: Session, unit_id: int):
    db_unit = get_unit(db, unit_id)
    if db_unit:
        db.delete(db_unit)
        db.commit()
    return db_unit


# ==================== Expense CRUD ====================

def get_expenses(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Expense).offset(skip).limit(limit).all()


def create_expense(db: Session, expense: schemas.ExpenseCreate):
    db_expense = models.Expense(**expense.dict())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


def delete_expense(db: Session, expense_id: int):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if db_expense:
        db.delete(db_expense)
        db.commit()
    return db_expense


# ==================== Activity Log CRUD ====================

def create_activity_log(db: Session, user_id: int, action: str, details: str = None):
    # Fetch user to check role
    user = get_user(db, user_id)
    if user and user.role == "employee":
        return None  # Do not log activity for employees

    db_log = models.ActivityLog(user_id=user_id, action=action, details=details)
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def get_activity_logs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.ActivityLog).order_by(models.ActivityLog.timestamp.desc()).offset(skip).limit(limit).all()
