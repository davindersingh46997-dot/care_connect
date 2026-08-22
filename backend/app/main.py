import os
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.models.user import User, RoleEnum
from backend.app.models.doctor import Doctor, AccountStatusEnum, ClinicStatusEnum
from backend.app.models.queue import QueueEntry, QueueStatusEnum
from backend.app.models.review import Review
from backend.app.services.auth_service import hash_password

# Routers
from backend.app.routers import auth, doctors, queue, admin, ai, reviews, patients

# Initialize FastAPI App
app = FastAPI(
    title=settings.APP_NAME,
    description="Real-time Local Healthcare Access & Digital Queue Management Platform",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create Database tables and initial Admin if configured
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if admin exists; if not, create ONLY required system admin
        if settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD:
            admin_email = settings.ADMIN_EMAIL.strip().lower()
            admin_user = db.query(User).filter(User.email == admin_email).first()
        else:
            admin_email = None
            admin_user = True
        if not admin_user and admin_email:
            new_admin = User(
                name=settings.ADMIN_NAME,
                email=admin_email,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                role=RoleEnum.ADMIN,
                location="System HQ"
            )
            db.add(new_admin)
            db.commit()
            print(f"[*] Initial system administrator account verified: {admin_email}")
    finally:
        db.close()

# Mount Static Files & Templates
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATIC_DIR = os.path.join(BASE_DIR, "frontend", "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "frontend", "templates")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Include API Routers
app.include_router(auth.router)
app.include_router(doctors.router)
app.include_router(queue.router)
app.include_router(admin.router)
app.include_router(ai.router)
app.include_router(reviews.router)
app.include_router(patients.router)

# Health Check Endpoint
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "database": "SQLite (Production-ready ORM schema)",
        "version": "2.0.0"
    }

# ==========================================
# Frontend HTML Page Routes
# ==========================================

@app.get("/", response_class=HTMLResponse)
def page_landing(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "page_title": "Care Connect — Know where to go. Know when to go."})

@app.get("/how-it-works", response_class=HTMLResponse)
def page_how_it_works(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "page_title": "How Care Connect Works"})

@app.get("/for-doctors", response_class=HTMLResponse)
def page_for_doctors(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "page_title": "Care Connect for Healthcare Providers"})

@app.get("/login", response_class=HTMLResponse)
def page_login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request, "page_title": "Log In — Care Connect"})

@app.get("/signup", response_class=HTMLResponse)
def page_signup(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request, "page_title": "Patient Registration — Care Connect"})

@app.get("/doctor-register", response_class=HTMLResponse)
def page_doctor_register(request: Request):
    return templates.TemplateResponse("doctor_register.html", {"request": request, "page_title": "Doctor Onboarding — Care Connect"})

@app.get("/patient/dashboard", response_class=HTMLResponse)
def page_patient_dashboard(request: Request):
    return templates.TemplateResponse("patient_dashboard.html", {"request": request, "page_title": "Patient Dashboard — Care Connect"})

@app.get("/patient/search", response_class=HTMLResponse)
@app.get("/patient/doctors", response_class=HTMLResponse)
def page_doctor_search(request: Request):
    return templates.TemplateResponse("doctor_search.html", {"request": request, "page_title": "Find Healthcare Providers — Care Connect"})

@app.get("/patient/doctors/{doctor_id}", response_class=HTMLResponse)
def page_doctor_profile(doctor_id: int, request: Request):
    return templates.TemplateResponse("doctor_profile.html", {"request": request, "doctor_id": doctor_id, "page_title": "Doctor Profile — Care Connect"})

@app.get("/patient/queue", response_class=HTMLResponse)
def page_patient_queue(request: Request):
    return templates.TemplateResponse("patient_queue.html", {"request": request, "page_title": "Live Queue Tracker — Care Connect"})

@app.get("/patient/profile", response_class=HTMLResponse)
def page_patient_profile(request: Request):
    return templates.TemplateResponse("patient_profile.html", {"request": request, "page_title": "Patient Profile — Care Connect"})

@app.get("/doctor/login", response_class=HTMLResponse)
def page_doctor_login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request, "page_title": "Doctor Portal Login — Care Connect"})

@app.get("/doctor/dashboard", response_class=HTMLResponse)
@app.get("/doctor/queue", response_class=HTMLResponse)
@app.get("/doctor/profile", response_class=HTMLResponse)
def page_doctor_dashboard(request: Request):
    return templates.TemplateResponse("doctor_dashboard.html", {"request": request, "page_title": "Doctor Workspace — Care Connect"})

@app.get("/admin/dashboard", response_class=HTMLResponse)
@app.get("/admin/doctors", response_class=HTMLResponse)
def page_admin_dashboard(request: Request):
    return templates.TemplateResponse("admin_dashboard.html", {"request": request, "page_title": "Admin Dashboard — Care Connect"})
