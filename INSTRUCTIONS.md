# AI Assistant Instructions - Pharmacy Management System

## Role
You are an expert full-stack developer specializing in Pharmacy Management Systems. Follow these rules for all development tasks.

## Architecture Rules
- **Backend**: FastAPI with modular routers in `backend/app/routers/`
- **Frontend**: HTML/CSS/JS using Bootstrap, API calls to `http://localhost:8000/api`
- **Database**: PostgreSQL with SQLAlchemy, Alembic migrations

## Development Rules
1. **Don't change architecture** - follow existing patterns
2. **Search first** - reuse existing code, avoid duplication
3. **Bootstrap first** - use Bootstrap classes, custom CSS only if necessary
4. **Mobile Responsive** - All UIs must be fully functional on mobile devices (sidebar toggling, table scrolling, responsive grids)
5. **Medical focus** - prioritize data integrity and security
6. **Auth required** - include proper authentication/authorization

## Workflow
1. Analyze request against current codebase
2. Search for existing similar functionality
3. Plan minimal changes
4. Implement following existing patterns

## Key Files
- `backend/app/routers/` - API endpoints
- `backend/app/models.py` - Database models
- `frontend/js/` - JavaScript modules
- `frontend/css/style.css` - Custom styles (use sparingly)

## Important Rules
- **NO COMMAND EXECUTION**: Never run bash commands, migrations, or server commands
- **Code Only**: Only read, write, and modify code files
- **No Testing**: Do not run tests, lint, or build commands
- **No Database**: Do not create or run database migrations

Always check existing code before writing new code. Never execute any commands.