from pydantic import BaseModel, validator
from datetime import date, datetime
from typing import List, Optional, Generic, TypeVar

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

# Unit Schemas
class UnitBase(BaseModel):
    name: str

class UnitCreate(UnitBase):
    pass

class Unit(UnitBase):
    id: int

    class Config:
        from_attributes = True

# Medicine Batch Schemas
class MedicineBatchBase(BaseModel):
    medicine_id: int
    supplier_name: str
    batch_quantity: int
    unit_id: int # Changed from 'unit: str' to 'unit_id: int'
    per_product_discount: float
    discount_type: Optional[str] = "fixed" # 'fixed' or 'percentage'
    invoice_number: str
    expiry_date: date
    purchase_date: Optional[date] = None
    total_batch_discount: float
    selling_price: Optional[float] = 0.0 # Added selling_price

class MedicineBatchCreate(MedicineBatchBase):
    pass

class MedicineBatch(MedicineBatchBase):
    id: int
    unit: Unit # Add unit relationship

    @validator('discount_type', pre=True, always=True)
    def set_discount_type_default(cls, v):
        return v if v is not None else "fixed"

    class Config:
        from_attributes = True

# Medicine Schemas
class MedicineBase(BaseModel):
    name: str
    generic_name: Optional[str] = None
    manufacturer: Optional[str] = None
    strength: Optional[str] = None
    medicine_type: Optional[str] = None
    purchase_price: float
    selling_price: float

class MedicineCreate(MedicineBase):
    pass

class Medicine(MedicineBase):
    id: int
    stock_quantity: int # Kept in the response model
    purchase_date: Optional[date] = None # Added purchase_date
    batches: List[MedicineBatch] = [] # Forward reference for type hinting

    class Config:
        from_attributes = True

# Unified Purchase Schema for Invoice-based entry
class PurchaseInvoiceItem(BaseModel):
    # For new medicine
    medicine_name: Optional[str] = None
    generic_name: Optional[str] = None
    manufacturer: Optional[str] = None
    strength: Optional[str] = None
    medicine_type: Optional[str] = None
    
    # For existing medicine
    medicine_id: Optional[int] = None

    quantity: int
    unit_id: int
    expiry_date: date
    medicine_purchase_price: float
    medicine_selling_price: float
    # Discounts (calculated on frontend)
    per_product_discount: float = 0.0
    discount_type: str = "fixed"
    total_batch_discount: float = 0.0

class PurchaseInvoiceCreate(BaseModel):
    supplier_name: str
    invoice_number: str
    purchase_date: date
    invoice_discount: float = 0.0
    discount_type: str = "fixed"
    paid_amount: float = 0.0
    items: List[PurchaseInvoiceItem]


# Purchase Schemas
class PurchaseItemBase(BaseModel):
    medicine_id: int
    quantity: int
    price_at_purchase: float
    expiry_date: Optional[date] = None # Added expiry_date
    selling_price: Optional[float] = 0.0 # Added selling_price

class PurchaseItemCreate(PurchaseItemBase):
    pass

class PurchaseItem(PurchaseItemBase):
    id: int
    medicine: Medicine

    class Config:
        from_attributes = True

class PurchaseBase(BaseModel):
    supplier_name: str
    invoice_number: str
    purchase_date: date
    total_amount: float = 0.0
    invoice_discount: float = 0.0
    discount_type: Optional[str] = "fixed"
    paid_amount: float = 0.0
    payment_status: str = "unpaid"

class PurchaseCreate(PurchaseBase):
    items: List[PurchaseItemCreate]

class Purchase(PurchaseBase):
    id: int
    items: List[PurchaseItem] = []

    @validator('total_amount', 'invoice_discount', 'paid_amount', pre=True, always=True)
    def set_float_defaults(cls, v):
        return v if v is not None else 0.0

    @validator('discount_type', pre=True, always=True)
    def set_discount_type_default(cls, v):
        return v if v is not None else "fixed"

    @validator('payment_status', pre=True, always=True)
    def set_payment_status(cls, v):
        return v if v is not None else "unpaid"

    class Config:
        from_attributes = True

# Sale Schemas
class SaleItemBase(BaseModel):
    medicine_id: int
    quantity: int
    discount_amount: float = 0.0
    discount_type: str = "fixed"

class SaleItemCreate(SaleItemBase):
    pass

class SaleItem(SaleItemBase):
    id: int
    price_at_sale: float
    medicine: Medicine

    class Config:
        from_attributes = True

class SaleBase(BaseModel):
    sale_date: date
    buyer_name: Optional[str] = None
    buyer_mobile: Optional[str] = None
    buyer_address: Optional[str] = None
    amount_paid: float = 0.0
    discount_amount: float = 0.0 # Added discount
    discount_type: str = "fixed" # Added discount type

class SaleCreate(SaleBase):
    items: List[SaleItemCreate]

class SaleUpdate(BaseModel):
    amount_paid: float

class Sale(SaleBase):
    id: int
    total_amount: float
    due_amount: float
    items: List[SaleItem] = []

    class Config:
        from_attributes = True

# Shareholder Schemas
class ShareholderBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    joined_date: date
    user_id: Optional[int] = None

class ShareholderCreate(ShareholderBase):
    pass

class Shareholder(ShareholderBase):
    id: int
    total_investment: float = 0.0 # Calculated field
    share_percentage: float = 0.0 # Calculated field

    class Config:
        from_attributes = True

# Investment Schemas
class InvestmentBase(BaseModel):
    shareholder_id: Optional[int] = None
    target_user_id: Optional[int] = None # Added for linking User directly
    investor_name: Optional[str] = None
    amount: float
    investment_date: date

class InvestmentCreate(InvestmentBase):
    pass

class Investment(InvestmentBase):
    id: int
    shareholder: Optional[Shareholder] = None

    class Config:
        from_attributes = True

# Profit Distribution Schemas
class ProfitDistributionBase(BaseModel):
    shareholder_id: int
    amount: float
    distribution_date: date
    note: Optional[str] = None

class ProfitDistributionCreate(ProfitDistributionBase):
    pass

class ProfitDistribution(ProfitDistributionBase):
    id: int
    shareholder: Shareholder

    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    username: str
    email: str
    role: str = "customer"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Employee Schemas
class EmployeeBase(BaseModel):
    name: str
    role: str
    base_salary: float
    overtime_rate: float = 0.0
    user_id: Optional[int] = None

class EmployeeCreate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    id: int
    user: Optional[User] = None

    @validator('base_salary', 'overtime_rate', pre=True, always=True)
    def set_employee_defaults(cls, v):
        return v if v is not None else 0.0

    class Config:
        from_attributes = True

class EmployeeBillBase(BaseModel):
    employee_id: int
    payment_date: date
    base_amount: float
    overtime_amount: float

class EmployeeBillCreate(EmployeeBillBase):
    pass

class EmployeeBill(EmployeeBillBase):
    id: int
    total_amount: float
    employee: Employee

    class Config:
        from_attributes = True

# Expense Schemas
class ExpenseBase(BaseModel):
    description: str
    amount: float
    expense_date: date
    category: str

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: int

    class Config:
        from_attributes = True


# Supplier Schemas
class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class Supplier(SupplierBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Activity Log Schemas
class ActivityLogBase(BaseModel):
    user_id: int
    action: str
    details: Optional[str] = None

class ActivityLogCreate(ActivityLogBase):
    pass

class ActivityLog(ActivityLogBase):
    id: int
    timestamp: datetime
    user: Optional[UserBase] = None  # Use UserBase to avoid circular dependency if possible, or just minimal info

    class Config:
        from_attributes = True
