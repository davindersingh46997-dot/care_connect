from backend.app.config import settings
from backend.app.services.google_doctor_service import fetch_real_doctors_from_google


def test_fetch_real_doctors_from_google_parses_places_results(monkeypatch):
    settings.GOOGLE_MAPS_API_KEY = "test-key"

    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "results": [
                    {
                        "name": "Dr. Mehta Clinic",
                        "formatted_address": "12 MG Road, Bengaluru",
                        "geometry": {"location": {"lat": 12.9716, "lng": 77.5946}},
                        "rating": 4.8,
                        "user_ratings_total": 312,
                        "opening_hours": {"open_now": True},
                        "place_id": "google-place-1",
                    }
                ]
            }

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def get(self, url, params=None):
            assert url.endswith("/maps/api/place/textsearch/json")
            assert params["query"] == "Cardiology"
            assert params["key"] == "test-key"
            return FakeResponse()

    monkeypatch.setattr("backend.app.services.google_doctor_service.httpx.Client", FakeClient)

    results = fetch_real_doctors_from_google("Cardiology")

    assert len(results) == 1
    assert results[0]["name"] == "Dr. Mehta Clinic"
    assert results[0]["source"] == "google"
    assert results[0]["clinic_status"] == "OPEN"
