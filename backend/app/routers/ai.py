from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.services.gemini_service import classify_specialty_intent

router = APIRouter(tags=["AI Specialty Navigation"])

class SpecialtyRequest(BaseModel):
    prompt: Optional[str] = None
    query: Optional[str] = None

@router.post("/api/ai/specialty")
@router.post("/api/ai/match-specialty")
@router.post("/api/match-specialty")
async def classify_specialty(payload: SpecialtyRequest):
    """Categorize a patient's natural language healthcare concern into an appropriate medical specialty."""
    text = (payload.prompt or payload.query or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Please describe your health concern.")
    
    result = await classify_specialty_intent(text)
    result["matched_specialty"] = result["specialty"]
    return result

