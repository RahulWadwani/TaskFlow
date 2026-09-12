from datetime import datetime
from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

# Dedicated router for serving frontend UI views
frontend_router = APIRouter(tags=["frontend"])

# Path is relative to wherever uvicorn is run from (your project root).
templates = Jinja2Templates(directory="frontend")


def render(request: Request, template_name: str, **context):
    """Small helper so every route below doesn't repeat the same boilerplate."""
    return templates.TemplateResponse(
        request,
        template_name,
        {"current_year": datetime.now().year, **context}
    )


@frontend_router.get("/")
def home(request: Request):
    return render(request, "index.html")


@frontend_router.get("/login")
def login_page(request: Request):
    return render(request, "pages/login.html")


@frontend_router.get("/register")
def register_page(request: Request):
    return render(request, "pages/register.html")


@frontend_router.get("/forgot-password")
def forgot_password_page(request: Request):
    return render(request, "pages/forgot_pass.html")


@frontend_router.get("/dashboard")
def dashboard_page(request: Request):
    # Note: User data is handled dynamically by JS on the frontend, 
    # but context variables can still be passed here if needed for initial rendering.
    return render(request, "pages/dashboard.html", active_page="dashboard")


@frontend_router.get("/tasks")
def tasks_page(request: Request):
    return render(request, "pages/tasks.html", active_page="tasks")


@frontend_router.get("/tasks/{task_id}")
def task_details_page(request: Request, task_id: int):
    return render(request, "pages/task-details.html", active_page="tasks", task_id=task_id)


@frontend_router.get("/projects")
def projects_page(request: Request):
    return render(request, "pages/projects.html", active_page="projects")


@frontend_router.get("/calendar")
def calendar_page(request: Request):
    return render(request, "pages/calendar.html", active_page="calendar")


@frontend_router.get("/important")
def important_page(request: Request):
    return render(request, "pages/important.html", active_page="important")


@frontend_router.get("/settings")
def settings_page(request: Request):
    return render(request, "pages/settings.html", active_page="settings")


@frontend_router.get("/profile")
def profile_page(request: Request):
    return render(request, "pages/profile.html", active_page="profile")