import httpx

from backend.app.config import settings


_GOOGLE_PLACES_BASE = "https://maps.googleapis.com/maps/api/place"


def _normalize_specialty(specialty: str | None) -> str:
    if not specialty:
        return "doctor"
    value = specialty.strip()
    if not value:
        return "doctor"
    return value


def _calculate_distance_km(lat1: float | None, lon1: float | None, lat2: float | None, lon2: float | None) -> float | None:
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    try:
        import math

        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1.0))
        return round(R * c, 1)
    except Exception:
        return None


def fetch_real_doctors_from_google(
    specialty: str | None,
    lat: float | None = None,
    lng: float | None = None,
    location: str | None = None,
    max_results: int = 5,
):
    api_key = (settings.GOOGLE_MAPS_API_KEY or "").strip()
    if not api_key:
        return []

    specialty_name = _normalize_specialty(specialty)
    if location and location.strip():
        place_query = f"{specialty_name} in {location.strip()}"
    else:
        place_query = specialty_name

    params = {
        "query": place_query,
        "key": api_key,
        "language": "en",
    }
    if lat is not None and lng is not None:
        params["location"] = f"{lat},{lng}"
        params["radius"] = 50000

    try:
        with httpx.Client(timeout=12.0) as client:
            response = client.get(f"{_GOOGLE_PLACES_BASE}/textsearch/json", params=params)
            if response.status_code != 200:
                return []
            payload = response.json() or {}
    except Exception:
        return []

    results = payload.get("results") or []
    doctors = []
    for item in results[:max_results]:
        name = (item.get("name") or "Google doctor").strip()
        address = item.get("formatted_address") or "Google Maps listing"
        geometry = item.get("geometry") or {}
        loc = geometry.get("location") or {}
        latitude = loc.get("lat")
        longitude = loc.get("lng")
        rating = item.get("rating")
        reviews_count = item.get("user_ratings_total") or 0
        is_open = bool((item.get("opening_hours") or {}).get("open_now"))
        doctors.append(
            {
                "id": item.get("place_id") or f"google-{len(doctors)}",
                "source": "google",
                "name": name,
                "specialty": specialty or "General Physician",
                "qualification": "Google Verified Medical Provider",
                "experience": 8,
                "fee": 0.0,
                "clinic_name": name,
                "address": address,
                "latitude": latitude,
                "longitude": longitude,
                "working_hours": "Google Maps listing",
                "bio": "Live provider listing from Google Maps.",
                "clinic_status": "OPEN" if is_open else "PAUSED",
                "distance_km": _calculate_distance_km(lat, lng, latitude, longitude),
                "waiting_count": 0,
                "current_token": 0,
                "estimated_wait_mins": 0,
                "rating": float(rating) if rating is not None else None,
                "reviews_count": reviews_count,
                "is_open": is_open,
                "score": 90,
                "recommendation_reasons": [
                    "Live listing from Google Maps",
                    f"{rating} rating" if rating is not None else "Rating unavailable",
                ],
            }
        )

    return doctors
