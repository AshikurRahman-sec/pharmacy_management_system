from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import medicines, purchases, sales, employees, investments, reports, users, units, add_purchase, expenses, suppliers, activity_logs, shareholders
from .database import engine
from . import models

from fastapi.staticfiles import StaticFiles
import os

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(medicines.router, prefix="/api")
app.include_router(purchases.router, prefix="/api")
app.include_router(sales.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(investments.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(units.router, prefix="/api")
app.include_router(add_purchase.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(suppliers.router, prefix="/api")
app.include_router(activity_logs.router, prefix="/api")
app.include_router(shareholders.router, prefix="/api")

# Mount frontend static files
# In Docker, we mounted the sibling 'frontend' dir to '/frontend' inside the container
frontend_path = "/frontend"

if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    # Fallback for local non-docker development
    frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend")
    if os.path.exists(frontend_path):
        app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
    else:
        print(f"Warning: Frontend directory not found at {frontend_path} or /frontend")
