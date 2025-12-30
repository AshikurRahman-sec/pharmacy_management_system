from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas
from ..dependencies import get_db

router = APIRouter(
    prefix="/units",
    tags=["units"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=schemas.Unit)
def create_unit(unit: schemas.UnitCreate, db: Session = Depends(get_db)):
    db_unit = crud.get_unit_by_name(db, name=unit.name)
    if db_unit:
        raise HTTPException(status_code=400, detail="Unit with this name already registered")
    return crud.create_unit(db=db, unit=unit)

@router.get("/", response_model=schemas.PaginatedResponse[schemas.Unit])
def read_units(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    data = crud.get_units(db, skip=skip, limit=limit)
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (data["total"] + limit - 1) // limit if limit > 0 else 1
    return {
        "items": data["items"],
        "total": data["total"],
        "page": page,
        "size": limit,
        "pages": total_pages
    }

@router.get("/{unit_id}", response_model=schemas.Unit)
def read_unit(unit_id: int, db: Session = Depends(get_db)):
    db_unit = crud.get_unit(db, unit_id=unit_id)
    if db_unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    return db_unit

@router.put("/{unit_id}", response_model=schemas.Unit)
def update_unit(unit_id: int, unit: schemas.UnitCreate, db: Session = Depends(get_db)):
    db_unit = crud.update_unit(db, unit_id=unit_id, unit=unit)
    if db_unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    return db_unit

@router.delete("/{unit_id}", response_model=schemas.Unit)
def delete_unit(unit_id: int, db: Session = Depends(get_db)):
    db_unit = crud.delete_unit(db, unit_id=unit_id)
    if db_unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    return db_unit
