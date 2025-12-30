from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from .. import crud, models, schemas
from ..dependencies import get_db
from ..auth import get_current_active_user

router = APIRouter()


@router.post("/medicines/", response_model=schemas.Medicine)
def create_medicine(
    medicine: schemas.MedicineCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create medicines")
    return crud.create_medicine(db=db, medicine=medicine, user_id=current_user.id)


@router.get("/medicines/", response_model=schemas.PaginatedResponse[schemas.Medicine])
def read_medicines(skip: int = 0, limit: int = 1000, search: str = None, stock_status: str = None, manufacturer: str = None, db: Session = Depends(get_db)):
    data = crud.get_medicines(db, skip=skip, limit=limit, search=search, stock_status=stock_status, manufacturer=manufacturer)
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (data["total"] + limit - 1) // limit if limit > 0 else 1
    return {
        "items": data["items"],
        "total": data["total"],
        "page": page,
        "size": limit,
        "pages": total_pages
    }


@router.get("/medicines/generic-names", response_model=List[str])
def get_generic_names(db: Session = Depends(get_db)):
    names = db.query(models.Medicine.generic_name).filter(models.Medicine.generic_name != None).distinct().all()
    return [name[0] for name in names if name[0]]


@router.get("/medicines/manufacturers", response_model=List[str])
def get_manufacturers(db: Session = Depends(get_db)):
    names = db.query(models.Medicine.manufacturer).filter(models.Medicine.manufacturer != None).distinct().all()
    return [name[0] for name in names if name[0]]


@router.get("/medicines/{medicine_id}", response_model=schemas.Medicine)
def read_medicine(medicine_id: int, db: Session = Depends(get_db)):
    db_medicine = crud.get_medicine(db, medicine_id=medicine_id)
    if db_medicine is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return db_medicine


@router.put("/medicines/{medicine_id}", response_model=schemas.Medicine)
def update_medicine(
    medicine_id: int,
    medicine: schemas.MedicineCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update medicines")
    db_medicine = crud.update_medicine(db, medicine_id=medicine_id, medicine=medicine)
    if db_medicine is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return db_medicine


@router.delete("/medicines/{medicine_id}", response_model=schemas.Medicine)
def delete_medicine(
    medicine_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete medicines")
    
    try:
        db_medicine = crud.delete_medicine(db, medicine_id=medicine_id)
        if db_medicine is None:
            raise HTTPException(status_code=404, detail="Medicine not found")
        return db_medicine
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cannot delete this medicine because it is associated with existing purchases or sales. Please delete the associated records first or keep this medicine for historical records."
        )


# ==================== Medicine Batch Endpoints ====================

@router.post("/medicines/{medicine_id}/batches/", response_model=schemas.MedicineBatch)
def create_medicine_batch(
    medicine_id: int,
    batch: schemas.MedicineBatchCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create medicine batches")
    if batch.medicine_id != medicine_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Medicine ID mismatch")
    db_medicine = crud.get_medicine(db, medicine_id=medicine_id)
    if db_medicine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    return crud.create_medicine_batch(db=db, batch=batch)


@router.get("/medicines/{medicine_id}/batches/", response_model=schemas.PaginatedResponse[schemas.MedicineBatch])
def read_medicine_batches(
    medicine_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    db_medicine = crud.get_medicine(db, medicine_id=medicine_id)
    if db_medicine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    data = crud.get_medicine_batches(db, medicine_id=medicine_id, skip=skip, limit=limit)
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (data["total"] + limit - 1) // limit if limit > 0 else 1
    return {
        "items": data["items"],
        "total": data["total"],
        "page": page,
        "size": limit,
        "pages": total_pages
    }


@router.get("/medicines/{medicine_id}/batches/{batch_id}", response_model=schemas.MedicineBatch)
def read_medicine_batch(
    medicine_id: int,
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    db_medicine = crud.get_medicine(db, medicine_id=medicine_id)
    if db_medicine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    db_batch = crud.get_medicine_batch(db, batch_id=batch_id)
    if db_batch is None or db_batch.medicine_id != medicine_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found for this medicine")
    return db_batch


@router.put("/medicines/{medicine_id}/batches/{batch_id}", response_model=schemas.MedicineBatch)
def update_medicine_batch(
    medicine_id: int,
    batch_id: int,
    batch: schemas.MedicineBatchCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update medicine batches")
    db_medicine = crud.get_medicine(db, medicine_id=medicine_id)
    if db_medicine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    db_batch = crud.get_medicine_batch(db, batch_id=batch_id)
    if db_batch is None or db_batch.medicine_id != medicine_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found for this medicine")
    return crud.update_medicine_batch(db=db, batch_id=batch_id, batch=batch)


@router.delete("/medicines/{medicine_id}/batches/{batch_id}", response_model=schemas.MedicineBatch)
def delete_medicine_batch(
    medicine_id: int,
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete medicine batches")
    db_medicine = crud.get_medicine(db, medicine_id=medicine_id)
    if db_medicine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    db_batch = crud.get_medicine_batch(db, batch_id=batch_id)
    if db_batch is None or db_batch.medicine_id != medicine_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found for this medicine")
    return crud.delete_medicine_batch(db=db, batch_id=batch_id)
