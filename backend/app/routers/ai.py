from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.services.gemini_service import classify_specialty_intent

router = APIRouter(prefix="/api/ai", tags=["AI Specialty Navigation"])

class SpecialtyRequest(BaseModel):
    prompt: str

@router.post("/specialty")
async def classify_specialty(payload: SpecialtyRequest):
    """Categorize a patient's natural language healthcare concern into an appropriate medical specialty."""
    if not payload.prompt or not payload.prompt.strip():
        raise HTTPException(status_code=400, detail="Please describe your health concern.")
    
    result = await classify_specialty_intent(payload.prompt)
    return result
