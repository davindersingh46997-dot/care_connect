import os

os.environ["DATABASE_URL"] = "sqlite:///./test_care_connect.db"

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models.user import RoleEnum

client = TestClient(app)


def test_no_admin_role_is_present():
    assert RoleEnum.PATIENT.value == "PATIENT"
    assert RoleEnum.DOCTOR.value == "DOCTOR"
    assert not hasattr(RoleEnum, "ADMIN")


def test_doctor_registration_is_direct_and_no_admin_approval_needed():
    payload = {
        "name": "Dr. Tan",
        "email": "doctor@example.com",
        "password": "strongpass123",
        "phone": "+1234567890",
        "specialty": "Dentistry",
        "qualification": "BDS",
        "experience": 8,
        "consultation_fee": 500,
        "clinic_name": "Smile Care",
        "clinic_address": "123 Main Street",
        "latitude": 12.97,
        "longitude": 77.59,
        "working_hours": "9:00 AM - 5:00 PM",
        "professional_registration_number": "REG-123",
        "profile_description": "Family dental care",
    }

    response = client.post("/api/doctors/register", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["user"]["role"] == "DOCTOR"
    assert data["doctor"]["clinic_status"] == "CLOSED"
    assert data["message"] == "Doctor account created successfully."


def test_public_doctor_search_is_available_without_auth():
    response = client.get("/api/doctors/search")
    assert response.status_code == 200, response.text
    assert response.json()["count"] == 0
