import os
import pytest

TEST_DB = "test_care_connect.db"
if os.path.exists(TEST_DB):
    try:
        os.remove(TEST_DB)
    except Exception:
        pass

os.environ["DATABASE_URL"] = f"sqlite:///./{TEST_DB}"

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models.user import RoleEnum
from backend.app.database import ensure_database_schema

ensure_database_schema()
client = TestClient(app)

def test_no_admin_role_is_present():
    assert RoleEnum.PATIENT.value == "PATIENT"
    assert RoleEnum.DOCTOR.value == "DOCTOR"
    assert not hasattr(RoleEnum, "ADMIN")

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "Care Connect API"

def test_public_doctor_search_empty():
    response = client.get("/api/doctors/search")
    assert response.status_code == 200
    assert response.json()["count"] == 0

def test_doctor_registration_and_workflow():
    doctor_payload = {
        "name": "Dr. Sarah Jenkins",
        "email": "sarah.jenkins@careconnect.test",
        "password": "DoctorPassword123!",
        "phone": "+91 98765 00001",
        "specialty": "Dermatology",
        "qualification": "MD (Dermatology)",
        "experience": 10,
        "consultation_fee": 400.0,
        "clinic_name": "Skin Wellness Center",
        "clinic_address": "100ft Road, Indiranagar, Bengaluru",
        "latitude": 12.9716,
        "longitude": 77.6412,
        "working_hours": "09:00 AM - 05:00 PM",
        "professional_registration_number": "MED-IND-12345",
        "profile_description": "Specialist in clinical dermatology.",
    }

    reg_res = client.post("/api/doctors/register", json=doctor_payload)
    assert reg_res.status_code == 201, reg_res.text
    data = reg_res.json()
    assert data["user"]["role"] == "DOCTOR"
    assert data["doctor"]["clinic_status"] == "CLOSED"
    doc_id = data["doctor"]["id"]
    doc_token = data["access_token"]

    # Login as doctor
    login_res = client.post("/api/auth/login", json={
        "email": "sarah.jenkins@careconnect.test",
        "password": "DoctorPassword123!"
    })
    assert login_res.status_code == 200
    assert login_res.json()["user"]["role"] == "DOCTOR"
    assert login_res.json()["user"]["doctor"]["clinic_status"] == "CLOSED"

    # Search: Doctor appears as CLOSED
    search_res = client.get("/api/doctors/search?lat=12.97&lng=77.64")
    assert search_res.status_code == 200
    doctors = search_res.json()["doctors"]
    assert len(doctors) == 1
    assert doctors[0]["clinic_status"] == "CLOSED"
    assert doctors[0]["is_open"] is False

    # Doctor opens clinic
    status_res = client.patch(
        f"/api/doctors/{doc_id}/status",
        headers={"Authorization": f"Bearer {doc_token}"},
        json={"clinic_status": "OPEN"}
    )
    assert status_res.status_code == 200
    assert status_res.json()["clinic_status"] == "OPEN"

    # Patient Registration
    patient_payload = {
        "name": "Jashandeep Singh",
        "email": "jashan@careconnect.test",
        "password": "PatientPassword123!",
        "age": 24,
        "latitude": 12.97,
        "longitude": 77.64
    }
    p_reg = client.post("/api/auth/register", json=patient_payload)
    assert p_reg.status_code == 201
    p_token = p_reg.json()["access_token"]
    assert p_reg.json()["user"]["role"] == "PATIENT"

    # Patient /api/auth/me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {p_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Jashandeep Singh"
    assert me_res.json()["role"] == "PATIENT"

    # Patient joins queue
    q_res = client.post(
        "/api/queue/join",
        headers={"Authorization": f"Bearer {p_token}"},
        json={"doctor_id": doc_id}
    )
    assert q_res.status_code == 201, q_res.text
    q_data = q_res.json()
    assert q_data["token_number"] == 1
    queue_id = q_data["queue_id"]

    # Patient polls live queue
    p_queue = client.get("/api/queue/patient", headers={"Authorization": f"Bearer {p_token}"})
    assert p_queue.status_code == 200
    assert p_queue.json()["has_active_queue"] is True
    assert p_queue.json()["active_queue"]["token_number"] == 1
    assert p_queue.json()["active_queue"]["status"] == "WAITING"

    # Doctor views live queue
    d_queue = client.get("/api/queue/doctor", headers={"Authorization": f"Bearer {doc_token}"})
    assert d_queue.status_code == 200
    assert len(d_queue.json()["waiting"]) == 1
    assert d_queue.json()["waiting"][0]["token_number"] == 1

    # Doctor calls next patient
    call_res = client.post("/api/queue/call-next", headers={"Authorization": f"Bearer {doc_token}"})
    assert call_res.status_code == 200
    assert call_res.json()["called_patient"]["token_number"] == 1

    # Patient polls: now in CONSULTING
    p_queue2 = client.get("/api/queue/patient", headers={"Authorization": f"Bearer {p_token}"})
    assert p_queue2.json()["active_queue"]["status"] == "CONSULTING"

    # Doctor completes consultation
    comp_res = client.post("/api/queue/complete", headers={"Authorization": f"Bearer {doc_token}"})
    assert comp_res.status_code == 200

    # Patient polls: consultation finished, past visit recorded
    p_queue3 = client.get("/api/queue/patient", headers={"Authorization": f"Bearer {p_token}"})
    assert p_queue3.json()["has_active_queue"] is False
    assert len(p_queue3.json()["recent_visits"]) == 1

    # Patient submits a review
    review_res = client.post(
        f"/api/doctors/{doc_id}/reviews",
        headers={"Authorization": f"Bearer {p_token}"},
        json={
            "queue_entry_id": queue_id,
            "rating": 5,
            "comment": "Excellent and punctual consultation!"
        }
    )
    assert review_res.status_code == 201, review_res.text

    # Public doctor profile shows 5.0 rating & 1 review
    doc_pub = client.get(f"/api/doctors/{doc_id}")
    assert doc_pub.status_code == 200
    assert doc_pub.json()["rating"] == 5.0
    assert doc_pub.json()["reviews_count"] == 1

