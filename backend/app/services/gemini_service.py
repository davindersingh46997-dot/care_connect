import json
import httpx
from backend.app.config import settings

DISCLAIMER_TEXT = (
    "Care Connect does not provide medical diagnosis or treatment. Specialty suggestions "
    "are for healthcare navigation only. If you are experiencing a medical emergency, contact "
    "local emergency services or visit the nearest emergency department."
)

EMERGENCY_KEYWORDS = [
    "chest pain", "crushing chest", "heart attack", "difficulty breathing",
    "cannot breathe", "can't breathe", "severe shortness of breath", "sudden numbness",
    "facial drooping", "slurred speech", "paralysis", "heavy bleeding",
    "uncontrollable bleeding", "coughing blood", "vomiting blood", "passed out",
    "unconscious", "seizure", "convulsion", "anaphylaxis", "throat swelling",
    "swollen tongue", "severe overdose", "suicide", "poisoning"
]

SPECIALTY_RULES = [
    {
        "specialty": "Dermatology",
        "keywords": [
            "skin", "rash", "itching", "itch", "itchy", "acne", "pimple", "eczema",
            "psoriasis", "hives", "urticaria", "mole", "dermatitis", "fungal", "scalp",
            "blister", "red spots", "skin allergy", "peeling", "dry patch", "hair fall"
        ],
        "explanation": "Symptoms involving skin irritation, itching, or rashes are best evaluated by a Dermatologist for proper clinical skin assessment."
    },
    {
        "specialty": "Dentistry",
        "keywords": [
            "tooth", "teeth", "dental", "gum", "gums", "cavity", "wisdom tooth",
            "toothache", "jaw pain", "bleeding gum", "molar", "root canal", "dentist",
            "filling", "enamel", "bad breath"
        ],
        "explanation": "Dental discomfort, toothache, and gum issues should be examined by a Dental Specialist (Dentist / Endodontist)."
    },
    {
        "specialty": "Orthopedics",
        "keywords": [
            "bone", "joint", "knee", "knee pain", "fracture", "sprain", "back pain",
            "backache", "sciatica", "shoulder", "elbow", "ankle", "spine", "ligament",
            "arthritis", "swollen knee", "twist", "tendon", "posture"
        ],
        "explanation": "Musculoskeletal, joint, ligament, and bone pain are evaluated by an Orthopedic Specialist."
    },
    {
        "specialty": "Pediatrics",
        "keywords": [
            "child", "baby", "toddler", "infant", "kid", "newborn", "vaccine",
            "pediatric", "my son", "my daughter", "child fever", "growth"
        ],
        "explanation": "Concerns regarding infant, toddler, or child health and vaccinations are managed by a Pediatrician."
    },
    {
        "specialty": "Cardiology",
        "keywords": [
            "heart", "palpitation", "palpitations", "irregular heart", "blood pressure",
            "hypertension", "cholesterol", "cardiac", "ecg", "lipid", "pulse"
        ],
        "explanation": "Non-emergency cardiovascular concerns and blood pressure evaluations are guided to a Cardiologist."
    },
    {
        "specialty": "ENT",
        "keywords": [
            "ear", "nose", "throat", "sinus", "sinusitis", "ear pain", "earache",
            "tonsil", "tonsillitis", "hearing", "vertigo", "voice", "hoarse", "nasal",
            "phlegm", "ear discharge", "earwax"
        ],
        "explanation": "Ear, nose, sinus, or throat conditions are best reviewed by an ENT Specialist (Otorhinolaryngologist)."
    },
    {
        "specialty": "Gynecology",
        "keywords": [
            "period", "menstrual", "menstruation", "pcos", "pregnancy", "pregnant",
            "pelvic", "vaginal", "cramps", "contraception", "ovary", "uterus",
            "gynecologist", "irregular cycle"
        ],
        "explanation": "Reproductive health, menstrual irregularities, and pregnancy checkups are guided to a Gynecologist & Obstetrician."
    },
    {
        "specialty": "General Physician",
        "keywords": [
            "fever", "cold", "cough", "flu", "headache", "weakness", "fatigue",
            "tired", "stomach", "digestion", "vomiting", "nausea", "diarrhea",
            "body ache", "chills", "malaise", "checkup", "general", "dizzy"
        ],
        "explanation": "General constitutional symptoms like seasonal viral fever, fatigue, or common cold are best initially addressed by a General Physician."
    }
]

async def classify_specialty_intent(user_prompt: str) -> dict:
    normalized = (user_prompt or "").strip().lower()

    if not normalized:
        return {
            "specialty": "General Physician",
            "confidence": 0.7,
            "reasoning": "Please describe your concern in detail. A General Physician is recommended for primary evaluation.",
            "is_emergency": False,
            "disclaimer": DISCLAIMER_TEXT
        }

    # Emergency Triage Check
    is_emergency = any(kw in normalized for kw in EMERGENCY_KEYWORDS)
    if is_emergency:
        return {
            "specialty": "Emergency Department / Urgent Care",
            "is_emergency": True,
            "confidence": 0.99,
            "warning": "This may require urgent medical attention. If you believe this is an emergency, seek immediate medical care or contact local emergency services.",
            "reasoning": "Your description contains symptoms that could indicate an urgent medical emergency. Please visit the nearest Emergency Room or call emergency services immediately.",
            "disclaimer": DISCLAIMER_TEXT
        }

    # Try Gemini API if key is present
    api_key = settings.GEMINI_API_KEY
    if api_key and len(api_key.strip()) > 5:
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                prompt_text = (
                    "You are a medical healthcare navigation assistant. You DO NOT diagnose diseases or prescribe medication.\n"
                    "Your role is strictly to help a patient identify which medical specialty they should visit based on their described concern.\n\n"
                    "Valid specialties:\n"
                    "- Dermatology\n"
                    "- General Physician\n"
                    "- Dentistry\n"
                    "- Orthopedics\n"
                    "- Pediatrics\n"
                    "- Cardiology\n"
                    "- ENT\n"
                    "- Gynecology\n\n"
                    f"Patient Concern: \"{user_prompt}\"\n\n"
                    "Respond with ONLY a raw JSON object with this exact schema:\n"
                    "{\n"
                    "  \"specialty\": \"<one of the valid specialties above>\",\n"
                    "  \"confidence\": <number between 0.0 and 1.0>,\n"
                    "  \"reasoning\": \"<1-2 sentence non-diagnostic explanation>\",\n"
                    "  \"is_emergency\": false\n"
                    "}"
                )
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt_text}]}],
                    "generationConfig": {
                        "temperature": 0.1,
                        "responseMimeType": "application/json"
                    }
                }
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    parsed = json.loads(text)
                    if "specialty" in parsed:
                        return {
                            "specialty": parsed.get("specialty", "General Physician"),
                            "confidence": parsed.get("confidence", 0.9),
                            "reasoning": parsed.get("reasoning", ""),
                            "is_emergency": False,
                            "disclaimer": DISCLAIMER_TEXT
                        }
        except Exception:
            pass

    # Deterministic high-accuracy rule-based classification fallback
    matched_specialty = None
    max_matches = 0
    explanation = ""

    for rule in SPECIALTY_RULES:
        matches = sum(1 for kw in rule["keywords"] if kw in normalized)
        if matches > max_matches:
            max_matches = matches
            matched_specialty = rule["specialty"]
            explanation = rule["explanation"]

    if not matched_specialty:
        matched_specialty = "General Physician"
        explanation = "A General Physician can provide primary care examination and guide you to specialized care if needed."

    return {
        "specialty": matched_specialty,
        "confidence": 0.95 if max_matches > 0 else 0.75,
        "reasoning": explanation,
        "is_emergency": False,
        "disclaimer": DISCLAIMER_TEXT
    }
