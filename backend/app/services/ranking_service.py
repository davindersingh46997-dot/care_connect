import math
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.doctor import Doctor, ClinicStatusEnum
from backend.app.models.queue import QueueEntry, QueueStatusEnum
from backend.app.models.review import Review

DEFAULT_USER_LATITUDE = None
DEFAULT_USER_LONGITUDE = None


def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


def get_doctor_real_metrics(db: Session, doctor: Doctor, user_lat: float, user_lng: float) -> dict:
    distance_km = calculate_distance_km(user_lat, user_lng, doctor.latitude, doctor.longitude) if user_lat is not None and user_lng is not None else None
    waiting_count = db.query(QueueEntry).filter(QueueEntry.doctor_id == doctor.id, QueueEntry.status == QueueStatusEnum.WAITING).count()
    consulting_entry = db.query(QueueEntry).filter(QueueEntry.doctor_id == doctor.id, QueueEntry.status == QueueStatusEnum.CONSULTING).first()
    is_consulting = consulting_entry is not None
    current_token = consulting_entry.token_number if consulting_entry else (
        db.query(func.max(QueueEntry.token_number)).filter(QueueEntry.doctor_id == doctor.id, QueueEntry.status == QueueStatusEnum.COMPLETED).scalar() or 0
    )
    total_active_in_queue = waiting_count + (1 if is_consulting else 0)
    avg_duration = doctor.avg_consult_duration_mins or 10
    estimated_wait_mins = total_active_in_queue * avg_duration
    reviews_count = db.query(Review).filter(Review.doctor_id == doctor.id).count()
    avg_rating_val = db.query(func.avg(Review.rating)).filter(Review.doctor_id == doctor.id).scalar()
    avg_rating = round(float(avg_rating_val), 1) if avg_rating_val else None
    is_open = doctor.clinic_status == ClinicStatusEnum.OPEN

    reasons = [
        f"✓ {distance_km} km away" if distance_km is not None else "Distance unavailable",
        f"✓ {estimated_wait_mins} min estimated wait ({total_active_in_queue} in queue)",
        f"✓ ₹{int(doctor.fee)} consultation fee",
    ]
    if avg_rating:
        reasons.append(f"✓ {avg_rating} rating ({reviews_count} patient reviews)")
    else:
        reasons.append("✓ New provider profile")
    if is_open:
        reasons.append("✓ Currently open and accepting patients")
    elif doctor.clinic_status == ClinicStatusEnum.PAUSED:
        reasons.append("⚠️ Queue temporarily paused")
    else:
        reasons.append("⚠️ Clinic closed")

    return {
        "distance_km": distance_km,
        "waiting_count": waiting_count,
        "is_consulting": is_consulting,
        "current_token": current_token,
        "total_active_in_queue": total_active_in_queue,
        "estimated_wait_mins": estimated_wait_mins,
        "reviews_count": reviews_count,
        "rating": avg_rating,
        "is_open": is_open,
        "recommendation_reasons": reasons,
    }


def rank_available_doctors(db: Session, specialty: str = "", user_lat: float | None = DEFAULT_USER_LATITUDE, user_lng: float | None = DEFAULT_USER_LONGITUDE, priority: str = "best_match", max_fee: float | None = None, max_distance: float | None = None, only_open: bool = False, min_rating: float | None = None) -> list:
    query = db.query(Doctor)
    if specialty and specialty.strip() and specialty != "All Specialties":
        query = query.filter(func.lower(Doctor.specialty) == specialty.strip().lower())
    if only_open:
        query = query.filter(Doctor.clinic_status == ClinicStatusEnum.OPEN)
    if max_fee:
        query = query.filter(Doctor.consultation_fee <= max_fee)


    doctors = query.all()
    enriched = []
    for doc in doctors:
        metrics = get_doctor_real_metrics(db, doc, user_lat, user_lng)
        if max_distance and metrics["distance_km"] is not None and metrics["distance_km"] > max_distance:
            continue
        if min_rating and (metrics["rating"] is None or metrics["rating"] < min_rating):
            continue
        enriched.append({"doctor": doc, "metrics": metrics})

    if not enriched:
        return []

    distances = [e["metrics"]["distance_km"] for e in enriched if e["metrics"]["distance_km"] is not None]
    max_dist = max(distances + [10.0])
    max_wait = max([e["metrics"]["estimated_wait_mins"] for e in enriched] + [60.0])
    max_doc_fee = max([e["doctor"].consultation_fee for e in enriched] + [1000.0])

    weights = {"specialty": 0.3, "distance": 0.2, "wait": 0.2, "rating": 0.15, "fee": 0.1, "availability": 0.05}

    if priority == "fastest":
        weights = {"wait": 0.5, "availability": 0.2, "distance": 0.15, "specialty": 0.1, "rating": 0.05, "fee": 0.0}
    elif priority == "nearest":
        weights = {"distance": 0.5, "specialty": 0.2, "wait": 0.15, "rating": 0.1, "fee": 0.05, "availability": 0.0}
    elif priority == "cheapest":
        weights = {"fee": 0.5, "rating": 0.2, "distance": 0.15, "wait": 0.1, "specialty": 0.05, "availability": 0.0}
    elif priority == "highest_rated":
        weights = {"rating": 0.5, "specialty": 0.2, "distance": 0.15, "wait": 0.1, "fee": 0.05, "availability": 0.0}

    scored = []
    for item in enriched:
        doc = item["doctor"]
        m = item["metrics"]
        spec_score = 1.0 if (not specialty or doc.specialty.lower() == specialty.lower()) else 0.5
        dist_score = max(0.0, 1.0 - (m["distance_km"] / max_dist)) if m["distance_km"] is not None else 0.0
        wait_score = max(0.0, 1.0 - (m["estimated_wait_mins"] / max_wait))
        rating_score = (m["rating"] / 5.0) if m["rating"] else 0.8
        fee_score = max(0.0, 1.0 - (doc.consultation_fee / max_doc_fee))
        avail_score = 1.0 if m["is_open"] else 0.0
        total_score = (
            weights.get("specialty", 0) * spec_score +
            weights.get("distance", 0) * dist_score +
            weights.get("wait", 0) * wait_score +
            weights.get("rating", 0) * rating_score +
            weights.get("fee", 0) * fee_score +
            weights.get("availability", 0) * avail_score
        )

        scored.append({
            "id": doc.id,
            "user_id": doc.user_id,
            "name": doc.user.name if doc.user else None,
            "specialty": doc.specialty,
            "qualification": doc.qualification,
            "experience": doc.experience,
            "fee": doc.consultation_fee,
            "clinic_name": doc.clinic_name,
            "address": doc.address,
            "latitude": doc.latitude,
            "longitude": doc.longitude,
            "working_hours": doc.working_hours,
            "bio": doc.profile_description,
            "clinic_status": doc.clinic_status.value,
            "distance_km": m["distance_km"],
            "waiting_count": m["waiting_count"],
            "current_token": m["current_token"],
            "estimated_wait_mins": m["estimated_wait_mins"],
            "rating": m["rating"],
            "reviews_count": m["reviews_count"],
            "is_open": m["is_open"],
            "score": int(total_score * 100),
            "recommendation_reasons": m["recommendation_reasons"],
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored
