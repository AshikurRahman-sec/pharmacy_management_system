from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..dependencies import get_db
from ..auth import get_current_active_user

router = APIRouter()


@router.post("/suppliers/", response_model=schemas.Supplier)
def create_supplier(
    supplier: schemas.SupplierCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    db_supplier = models.Supplier(**supplier.dict())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.get("/suppliers/", response_model=List[schemas.Supplier])
def read_suppliers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return db.query(models.Supplier).offset(skip).limit(limit).all()


@router.get("/suppliers/{supplier_id}", response_model=schemas.Supplier)
def read_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if db_supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return db_supplier


@router.put("/suppliers/{supplier_id}", response_model=schemas.Supplier)
def update_supplier(
    supplier_id: int,
    supplier: schemas.SupplierCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if db_supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    for key, value in supplier.dict().items():
        setattr(db_supplier, key, value)
    
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.delete("/suppliers/{supplier_id}", response_model=schemas.Supplier)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if db_supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    db.delete(db_supplier)
    db.commit()
    return db_supplier


@router.get("/suppliers/search/", response_model=List[schemas.Supplier])
def search_suppliers(
    q: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Search suppliers by name"""
    return db.query(models.Supplier).filter(
        models.Supplier.name.ilike(f"%{q}%")
    ).limit(10).all()

