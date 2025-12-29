# Pharmacy Management System - AI Coding Guidelines

## Architecture Overview
- **Backend**: FastAPI application with modular routers (`backend/app/routers/`) for medicines, sales, purchases, employees, etc.
- **Frontend**: Static HTML/CSS/JS using Bootstrap, communicating via REST API to `http://localhost:8000/api`
- **Database**: PostgreSQL with SQLAlchemy ORM, migrations via Alembic
- **Authentication**: JWT-based with role-based access (superadmin, admin, employee, customer)

## Key Patterns & Conventions

### Backend Structure
- **Routers**: Each module in `routers/` follows CRUD pattern with auth dependencies (e.g., `medicines.py`)
- **Authorization**: Check `current_user.role` against allowed roles before operations (e.g., only superadmin/admin can create medicines)
- **Models**: SQLAlchemy with relationships (e.g., `Medicine` has `batches` relationship in `models.py`)
- **Schemas**: Pydantic models in `schemas.py` for request/response validation
- **CRUD**: Database operations in `crud.py` using SQLAlchemy sessions

### Frontend Patterns
- **API Calls**: Use `fetchData()` from `js/api-utils.js` for authenticated requests with automatic token refresh
- **UI Framework**: Bootstrap utility classes first, custom CSS only when necessary (`css/style.css`)
- **Navigation**: Sidebar-based routing between HTML pages (e.g., `index.html`, `sales.html`)
- **State Management**: JWT tokens stored in localStorage, redirect to `login.html` on 401

### Development Workflows
- **Run Backend**: `uvicorn app.main:app --reload` (from `backend/` directory)
- **Database Migrations**: `alembic upgrade head` to apply migrations, `alembic revision --autogenerate -m "message"` for new changes
- **Docker Development**: `docker-compose up` runs backend on port 8000, Postgres on 5433
- **Frontend Serving**: Open HTML files directly in browser or use `python -m http.server 3000` from `frontend/`

### Code Style Examples
- **Router Endpoint**: Include auth dependency and role check (see `backend/app/routers/medicines.py` lines 10-18)
- **CRUD Function**: Use joinedload for relationships (see `crud.py` get_medicine function)
- **Schema Definition**: Include `orm_mode = True` in response models (see `schemas.py` Medicine class)
- **JS API Call**: Wrap in try-catch, handle 401 for token refresh (see `js/api-utils.js` fetchData function)

## Important Notes
- Always check existing code for similar functionality before implementing new features (DRY principle)
- Medicine batches track expiry and discounts; sales/purchases link to specific batches
- Employee management includes salary bills with overtime calculations
- Reports aggregate data across purchases, sales, and investments</content>
<parameter name="filePath">/media/ashik/All Files/Home of Project/pharmacy_management_system/.github/copilot-instructions.md