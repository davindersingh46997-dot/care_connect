import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from backend.app.config import settings
from backend.app.database import ensure_database_schema

from backend.app.routers import ai, auth, doctors, patients, queue, reviews


class ChatRequest(BaseModel):
    message: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ensure_database_schema()
    except Exception:
        app.state.startup_error = "Database initialization failed. Check DATABASE_URL and database connectivity."
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Care Connect patient and doctor healthcare access platform",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATIC_DIR = os.path.join(BASE_DIR, "frontend", "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "frontend", "templates")

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR) if os.path.exists(TEMPLATES_DIR) else None

app.include_router(auth.router)
app.include_router(doctors.router)
app.include_router(queue.router)
app.include_router(ai.router)
app.include_router(reviews.router)
app.include_router(patients.router)


@app.get("/api/health")
def health_check():
    try:
        ensure_database_schema()
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "service": "Care Connect API",
        "database": "ok" if db_ok else "unavailable",
    }


@app.get("/health")
def health_alias():
    return health_check()


def _render_template_or_fallback(request: Request, template_name: str, extra: dict | None = None):
    if templates is None:
        return HTMLResponse(f"<html><body><h1>Care Connect</h1><p>Template directory not found.</p></body></html>")
    context = {"request": request, "page_title": "Care Connect"}
    if extra:
        context.update(extra)
    return templates.TemplateResponse(template_name, context)


@app.get("/", response_class=HTMLResponse)
def page_landing(request: Request):
    return _render_template_or_fallback(request, "index.html", {"page_title": "Care Connect — Know where to go. Know when to go."})


@app.get("/how-it-works", response_class=HTMLResponse)
def page_how_it_works(request: Request):
    return _render_template_or_fallback(request, "index.html", {"page_title": "How Care Connect Works"})


@app.get("/for-doctors", response_class=HTMLResponse)
def page_for_doctors(request: Request):
    return _render_template_or_fallback(request, "index.html", {"page_title": "Care Connect for Healthcare Providers"})


@app.get("/login", response_class=HTMLResponse)
def page_login(request: Request):
    return _render_template_or_fallback(request, "login.html", {"page_title": "Log In — Care Connect"})


@app.get("/signup", response_class=HTMLResponse)
def page_signup(request: Request):
    return _render_template_or_fallback(request, "signup.html", {"page_title": "Patient Registration — Care Connect"})


@app.get("/patient/signup", response_class=HTMLResponse)
def page_patient_signup(request: Request):
    return _render_template_or_fallback(request, "signup.html", {"page_title": "Patient Registration — Care Connect"})


@app.get("/doctor/register", response_class=HTMLResponse)
def page_doctor_register(request: Request):
    return _render_template_or_fallback(request, "doctor_register.html", {"page_title": "Doctor Registration — Care Connect"})


@app.get("/patient/dashboard", response_class=HTMLResponse)
def page_patient_dashboard(request: Request):
    return _render_template_or_fallback(request, "patient_dashboard.html", {"page_title": "Patient Dashboard — Care Connect"})


@app.get("/patient/search", response_class=HTMLResponse)
@app.get("/patient/doctors", response_class=HTMLResponse)
def page_doctor_search(request: Request):
    return _render_template_or_fallback(request, "doctor_search.html", {"page_title": "Find Healthcare Providers — Care Connect"})


@app.get("/patient/doctors/{doctor_id}", response_class=HTMLResponse)
def page_doctor_profile(doctor_id: int, request: Request):
    return _render_template_or_fallback(request, "doctor_profile.html", {"doctor_id": doctor_id, "page_title": "Doctor Profile — Care Connect"})


@app.get("/patient/queue", response_class=HTMLResponse)
def page_patient_queue(request: Request):
    return _render_template_or_fallback(request, "patient_queue.html", {"page_title": "Live Queue Tracker — Care Connect"})


@app.get("/patient/profile", response_class=HTMLResponse)
def page_patient_profile(request: Request):
    return _render_template_or_fallback(request, "patient_profile.html", {"page_title": "Patient Profile — Care Connect"})


@app.get("/doctor/dashboard", response_class=HTMLResponse)
@app.get("/doctor/queue", response_class=HTMLResponse)
@app.get("/doctor/profile", response_class=HTMLResponse)
def page_doctor_dashboard(request: Request):
    return _render_template_or_fallback(request, "doctor_dashboard.html", {"page_title": "Doctor Workspace — Care Connect"})


@app.get("/doctor/login", response_class=HTMLResponse)
def page_doctor_login(request: Request):
    return _render_template_or_fallback(request, "login.html", {"page_title": "Doctor Portal Login — Care Connect"})


@app.get("/doctor-register", response_class=HTMLResponse)
def legacy_doctor_register(request: Request):
    return _render_template_or_fallback(request, "doctor_register.html", {"page_title": "Doctor Registration — Care Connect"})


@app.post("/api/chat")
def chat_endpoint(payload: ChatRequest):
    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required.")

    lower = message.lower()
    if any(term in lower for term in ["chest pain", "difficulty breathing", "stroke", "severe bleeding", "can't breathe", "cant breathe"]):
        return {
            "intent": "EMERGENCY",
            "response": "This may require urgent medical attention. Please seek emergency care immediately or contact local emergency services.",
            "action": "NONE",
            "data": None,
        }

    if any(term in lower for term in ["show doctors", "find doctor", "doctor search", "find a doctor", "need a doctor", "available doctors"]):
        return {
            "intent": "OPEN_DOCTOR_SEARCH",
            "response": "I found doctor search for you.",
            "action": "OPEN_DOCTOR_SEARCH",
            "data": {"specialty": "", "doctors": []},
        }

    if any(term in lower for term in ["my queue", "queue number", "where am i", "people ahead", "waiting time"]):
        return {
            "intent": "GET_MY_QUEUE",
            "response": "Please sign in to view your live queue status.",
            "action": "LOGIN",
            "data": None,
        }

    if any(term in lower for term in ["dark mode", "light mode", "theme"]):
        return {
            "intent": "TOGGLE_THEME",
            "response": "Theme controls are available in the app.",
            "action": "TOGGLE_THEME",
            "data": None,
        }

    return {
        "intent": "FAQ",
        "response": "I can help you find doctors, check queue status, or explain how Care Connect works.",
        "action": "NONE",
        "data": None,
    }


@app.post("/api/chat/stream")
def chat_stream(payload: ChatRequest):
    def generate():
        try:
            result = chat_endpoint(payload)
            chunk = {
                "event": "message",
                "data": result,
            }
            yield f"data: {chunk}\n\n"
        except Exception as exc:  # pragma: no cover
            yield f"event: error\ndata: {str(exc)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/queue/reset")
@app.post("/api/queue/reset-demo")
def reset_demo_queue():
    return {"message": "Demo queue data reset requested. In persistent environments, reset logic should be handled by the database or service layer.", "reset": True}

