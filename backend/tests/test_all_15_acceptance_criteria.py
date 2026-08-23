import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import ensure_database_schema

ensure_database_schema()
client = TestClient(app)

def test_complete_15_acceptance_criteria():
    # 1. Health check returns exact schema
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "Care Connect API"

    # 2. Doctor registration starts with CLOSED clinic status
    doc_payload = {
        "email": "dr.accept@careconnect.test",
        "password": "Password123!",
        "name": "Dr. Acceptance Test",
        "specialty": "Cardiology",
        "qualification": "MBBS, MD (Cardiology)",
        "experience": 15,
        "consultation_fee": 500.0,
        "clinic_name": "Acceptance Heart Care",
        "clinic_address": "100 MG Road, Bengaluru",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "working_hours": "09:00 AM - 06:00 PM",
        "profile_description": "Experienced cardiologist specializing in hypertension and ECG."
    }
    res = client.post("/api/doctors/register", json=doc_payload)
    assert res.status_code == 201, res.text
    doc_data = res.json()
    assert "access_token" in doc_data
    assert doc_data["doctor"]["clinic_status"] == "CLOSED"
    doc_token = doc_data["access_token"]
    doctor_id = doc_data["doctor"]["id"]

    # 3. Doctor login
    res = client.post("/api/auth/login", json={
        "email": "dr.accept@careconnect.test",
        "password": "Password123!"
    })
    assert res.status_code == 200
    assert res.json()["user"]["role"] == "DOCTOR"

    # 4. Doctor clinic status toggle (CLOSED -> OPEN)
    res = client.patch(
        f"/api/doctors/{doctor_id}/status",
        json={"clinic_status": "OPEN"},
        headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert res.status_code == 200
    assert res.json()["clinic_status"] == "OPEN"

    # 5. Patient 1 registration
    res = client.post("/api/auth/register", json={
        "name": "Patient Alpha",
        "email": "alpha@patient.test",
        "password": "Password123!",
        "age": 28,
        "phone": "+91 9999911111",
        "location": "Indiranagar, Bengaluru"
    })
    assert res.status_code == 201
    p1_token = res.json()["access_token"]

    # 6. Patient 2 registration
    res = client.post("/api/auth/register", json={
        "name": "Patient Beta",
        "email": "beta@patient.test",
        "password": "Password123!",
        "age": 34,
        "phone": "+91 9999922222",
        "location": "Koramangala, Bengaluru"
    })
    assert res.status_code == 201
    p2_token = res.json()["access_token"]

    # 7. AI Specialty matching
    res = client.post("/api/match-specialty", json={"query": "chest pain and irregular heartbeat"})
    assert res.status_code == 200
    match_data = res.json()
    assert match_data["matched_specialty"] == "Cardiology"

    # 8. Doctor search by specialty and distance
    res = client.get("/api/doctors/search?specialty=Cardiology&lat=12.97&lng=77.59")
    assert res.status_code == 200
    docs = res.json()["doctors"]
    assert len(docs) >= 1
    assert docs[0]["id"] == doctor_id
    assert docs[0]["clinic_status"] == "OPEN"

    # 9. Doctor detail view
    res = client.get(f"/api/doctors/{doctor_id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["name"] == "Dr. Acceptance Test"
    assert detail["clinic_status"] == "OPEN"

    # 10. Patient 1 joins queue -> Token #1
    res = client.post(
        "/api/queue/join",
        json={"doctor_id": doctor_id},
        headers={"Authorization": f"Bearer {p1_token}"}
    )
    assert res.status_code == 201
    q1 = res.json()
    assert q1["token_number"] == 1
    assert q1["status"] == "WAITING"
    assert q1["patients_ahead"] == 0
    q1_id = q1["queue_id"]

    # 11. Prevent double join while waiting
    res = client.post(
        "/api/queue/join",
        json={"doctor_id": doctor_id},
        headers={"Authorization": f"Bearer {p1_token}"}
    )
    assert res.status_code == 400

    # 12. Patient 2 joins queue -> Token #2
    res = client.post(
        "/api/queue/join",
        json={"doctor_id": doctor_id},
        headers={"Authorization": f"Bearer {p2_token}"}
    )
    assert res.status_code == 201
    q2 = res.json()
    assert q2["token_number"] == 2
    assert q2["status"] == "WAITING"
    assert q2["patients_ahead"] == 1
    assert q2["estimated_wait_mins"] == 15

    # 13. Doctor calls next patient -> Token #1 becomes CONSULTING
    res = client.post(
        "/api/queue/call-next",
        headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert res.status_code == 200
    assert res.json()["called_patient"]["token_number"] == 1

    # 14. Patient 1 live queue status
    res = client.get(
        "/api/queue/patient",
        headers={"Authorization": f"Bearer {p1_token}"}
    )
    assert res.status_code == 200
    p1_queue = res.json()
    assert p1_queue["has_active_queue"] is True
    assert p1_queue["active_queue"]["status"] == "CONSULTING"
    assert p1_queue["active_queue"]["token_number"] == 1

    # 15. Patient 2 live queue status
    res = client.get(
        "/api/queue/patient",
        headers={"Authorization": f"Bearer {p2_token}"}
    )
    assert res.status_code == 200
    p2_queue = res.json()
    assert p2_queue["has_active_queue"] is True
    assert p2_queue["active_queue"]["is_next"] is True
    assert p2_queue["active_queue"]["patients_ahead"] == 0

    # 16. Doctor completes Token #1 consultation
    res = client.post(
        "/api/queue/complete",
        headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert res.status_code == 200

    # 17. Review submission validation: Patient 2 (still waiting) cannot submit review
    res = client.post(
        f"/api/doctors/{doctor_id}/reviews",
        json={"queue_entry_id": q2["queue_id"], "rating": 5, "comment": "Premature review"},
        headers={"Authorization": f"Bearer {p2_token}"}
    )
    assert res.status_code == 400

    # 18. Patient 1 (completed) submits review
    res = client.post(
        f"/api/doctors/{doctor_id}/reviews",
        json={"queue_entry_id": q1_id, "rating": 5, "comment": "Excellent and thorough examination!"},
        headers={"Authorization": f"Bearer {p1_token}"}
    )
    assert res.status_code == 201
    rev_data = res.json()
    assert rev_data["rating"] == 5

    # 19. Doctor rating and reviews count updated
    res = client.get(f"/api/doctors/{doctor_id}")
    assert res.status_code == 200
    updated_doc = res.json()
    assert updated_doc["reviews_count"] == 1
    assert updated_doc["rating"] == 5.0

