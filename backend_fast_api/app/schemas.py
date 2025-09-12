from pydantic import BaseModel
from typing import List

class SymptomRuleOut(BaseModel):
    symptom: str
    follow_up_questions: List[str]

    class Config:
        from_attributes = True

class MapRequest(BaseModel):
    text: str

class MapResponse(BaseModel):
    symptoms: List[str]
