from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas, models
from ..dependencies import get_db
from ..auth import get_current_active_user

router = APIRouter()

@router.post("/employees/", response_model=schemas.Employee)
def create_employee(
    employee: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create employees")
    return crud.create_employee(db=db, employee=employee)

@router.get("/employees/", response_model=List[schemas.Employee])
def read_employees(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view employees")
    return crud.get_employees(db, skip=skip, limit=limit)

@router.put("/employees/{employee_id}", response_model=schemas.Employee)
def update_employee(
    employee_id: int,
    employee: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update employees")
    db_employee = crud.update_employee(db, employee_id=employee_id, employee=employee)
    if db_employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return db_employee

@router.delete("/employees/{employee_id}", response_model=schemas.Employee)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete employees")
    db_employee = crud.delete_employee(db, employee_id=employee_id)
    if db_employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return db_employee

@router.post("/employee-bills/", response_model=schemas.EmployeeBill)
def create_employee_bill(
    bill: schemas.EmployeeBillCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create employee bills")
    return crud.create_employee_bill(db=db, bill=bill)

@router.get("/employee-bills/", response_model=List[schemas.EmployeeBill])
def read_employee_bills(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view employee bills")
    return crud.get_employee_bills(db, skip=skip, limit=limit)
