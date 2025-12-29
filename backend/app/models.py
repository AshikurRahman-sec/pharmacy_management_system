from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    stock_quantity = Column(Integer)
    purchase_price = Column(Float)
    selling_price = Column(Float)
    purchase_date = Column(Date) # Added purchase_date

    batches = relationship("MedicineBatch", back_populates="medicine", cascade="all, delete-orphan")


class MedicineBatch(Base):
    __tablename__ = "medicine_batches"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"))
    supplier_name = Column(String)
    batch_quantity = Column(Integer)  # Quantity in this specific batch
    unit_id = Column(Integer, ForeignKey("units.id")) # Foreign key to the units table
    per_product_discount = Column(Float)
    invoice_number = Column(String, index=True) # Unique identifier for the batch (Supplier Invoice Number)
    expiry_date = Column(Date)
    purchase_date = Column(Date) # Added purchase_date to track when this batch was bought
    total_batch_discount = Column(Float) # Total discount for this batch (e.g., from supplier)

    medicine = relationship("Medicine", back_populates="batches")
    unit = relationship("Unit", back_populates="batches")



class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    supplier_name = Column(String)
    invoice_number = Column(String, unique=True, index=True) # Added invoice_number
    purchase_date = Column(Date)
    total_amount = Column(Float)
    invoice_discount = Column(Float, default=0.0) # Added invoice_discount
    paid_amount = Column(Float, default=0.0)  # Amount paid for this purchase
    payment_status = Column(String, default="unpaid")  # 'unpaid', 'partial', 'paid'
    items = relationship("PurchaseItem", back_populates="purchase")

class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"))
    medicine_id = Column(Integer, ForeignKey("medicines.id"))
    quantity = Column(Integer)
    price_at_purchase = Column(Float)
    purchase = relationship("Purchase", back_populates="items")
    medicine = relationship("Medicine")

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    sale_date = Column(Date)
    buyer_name = Column(String, nullable=True)
    buyer_mobile = Column(String, nullable=True)
    buyer_address = Column(String, nullable=True)
    total_amount = Column(Float, default=0.0)
    amount_paid = Column(Float, default=0.0)
    due_amount = Column(Float, default=0.0)
    
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"))
    medicine_id = Column(Integer, ForeignKey("medicines.id"))
    quantity = Column(Integer)
    price_at_sale = Column(Float)
    sale = relationship("Sale", back_populates="items")
    medicine = relationship("Medicine")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    role = Column(String) # Job title (e.g., Cashier, Pharmacist)
    base_salary = Column(Float)
    overtime_rate = Column(Float, default=0.0)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User")
    bills = relationship("EmployeeBill", back_populates="employee", cascade="all, delete-orphan")

class EmployeeBill(Base):
    __tablename__ = "employee_bills"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    payment_date = Column(Date)
    base_amount = Column(Float)
    overtime_amount = Column(Float)
    total_amount = Column(Float)
    employee = relationship("Employee", back_populates="bills")

class Shareholder(Base):
    __tablename__ = "shareholders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    joined_date = Column(Date)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Linked User

    user = relationship("User")
    investments = relationship("Investment", back_populates="shareholder", cascade="all, delete-orphan")
    distributions = relationship("ProfitDistribution", back_populates="shareholder", cascade="all, delete-orphan")

class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True)
    shareholder_id = Column(Integer, ForeignKey("shareholders.id"), nullable=True) # Linked to shareholder
    investor_name = Column(String, nullable=True) # Keep for backward compatibility or direct text
    amount = Column(Float)
    investment_date = Column(Date)

    shareholder = relationship("Shareholder", back_populates="investments")

class ProfitDistribution(Base):
    __tablename__ = "profit_distributions"

    id = Column(Integer, primary_key=True, index=True)
    shareholder_id = Column(Integer, ForeignKey("shareholders.id"))
    amount = Column(Float)
    distribution_date = Column(Date)
    note = Column(String, nullable=True)

    shareholder = relationship("Shareholder", back_populates="distributions")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="customer") # superadmin, admin, employee, customer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    batches = relationship("MedicineBatch", back_populates="unit")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    amount = Column(Float)
    expense_date = Column(Date)
    category = Column(String) # e.g., Electricity, Rent, Personal


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    contact_person = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)  # e.g., "Created Medicine", "Updated Stock"
    details = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")
