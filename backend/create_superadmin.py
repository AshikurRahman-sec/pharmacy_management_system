import asyncio
from getpass import getpass
from app import crud, schemas
from app.database import SessionLocal

def main():
    db = SessionLocal()
    print("Creating superadmin user...")
    username = input("Enter username: ")
    email = input("Enter email: ")
    password = getpass("Enter password: ")
    user = schemas.UserCreate(username=username, email=email, password=password, role="superadmin")
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        print("User with this email already exists.")
    else:
        crud.create_user(db=db, user=user)
        print("Superadmin user created successfully.")
    db.close()

if __name__ == "__main__":
    main()
