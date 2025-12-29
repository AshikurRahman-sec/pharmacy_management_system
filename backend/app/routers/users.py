from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List

from .. import auth, crud, models, schemas
from ..dependencies import get_db
from ..mail import send_email

router = APIRouter()


@router.post("/token", response_model=auth.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not crud.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    refresh_token = auth.create_refresh_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "role": user.role,
    }


@router.post("/refresh", response_model=auth.Token)
async def refresh_token(
    current_user: models.User = Depends(auth.get_current_user_from_refresh_token),
):
    access_token = auth.create_access_token(data={"sub": current_user.email})
    refresh_token = auth.create_refresh_token(data={"sub": current_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "role": current_user.role,
    }


@router.get("/users/me", response_model=schemas.User)
async def read_user_me(
    current_user: models.User = Depends(auth.get_current_active_user),
):
    return current_user



@router.post("/users/", response_model=schemas.User)
async def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    # Role-based authorization
    if current_user.role == "employee" and user.role != "customer":
        raise HTTPException(status_code=403, detail="Employees can only create customers")
    if current_user.role == "admin" and user.role not in ["employee", "customer"]:
        raise HTTPException(status_code=403, detail="Admins can only create employees and customers")
    if current_user.role == "superadmin" and user.role not in ["admin", "employee", "customer"]:
        raise HTTPException(status_code=403, detail="Superadmins can only create admins, employees and customers")

    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    await send_email([user.email], user.password)
    return crud.create_user(db=db, user=user)


@router.get("/users/", response_model=List[schemas.User])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view users")
    return crud.get_users(db, skip=skip, limit=limit)


@router.delete("/users/{user_id}", response_model=schemas.User)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete users")
    db_user = crud.delete_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user
