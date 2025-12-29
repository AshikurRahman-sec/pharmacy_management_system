from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas, models
from ..dependencies import get_db
from ..auth import get_current_active_user

router = APIRouter()

@router.post("/sales/", response_model=schemas.Sale)
def create_sale(
    sale: schemas.SaleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin", "employee"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create sales")
    try:
        return crud.create_sale(db=db, sale=sale)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/sales/", response_model=List[schemas.Sale])
def read_sales(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return crud.get_sales(db, skip=skip, limit=limit)

@router.get("/sales/{sale_id}", response_model=schemas.Sale)
def read_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    db_sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if db_sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")
    return db_sale

@router.patch("/sales/{sale_id}/payment", response_model=schemas.Sale)
def update_sale_payment(
    sale_id: int,
    sale_update: schemas.SaleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin", "employee"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    db_sale = crud.update_sale_payment(db, sale_id=sale_id, sale_update=sale_update)
    if db_sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")
    return db_sale


@router.delete("/sales/{sale_id}", response_model=schemas.Sale)
def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete sales")
    db_sale = crud.delete_sale(db, sale_id=sale_id)
    if db_sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")
    return db_sale
