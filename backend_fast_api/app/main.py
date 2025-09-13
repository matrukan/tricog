import os
import re
from typing import List
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .model import SymptomRule
from .schemas import SymptomRuleOut, MapRequest, MapResponse
from .seed import seed_rules

app = FastAPI(title="Tricog Rules API", version="0.1.0")

# CORS
origins = [os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Seed once (idempotent)
with next(get_db()) as db:
    seed_rules(db)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/symptoms", response_model=List[SymptomRuleOut])
def list_symptoms(db: Session = Depends(get_db)):
    rules = db.query(SymptomRule).order_by(SymptomRule.symptom.asc()).all()
    return rules

@app.get("/followups/{symptom}", response_model=SymptomRuleOut)
def get_followups(symptom: str, db: Session = Depends(get_db)):
    rule = db.get(SymptomRule, symptom.lower())
    if not rule:
        raise HTTPException(status_code=404, detail="Unknown symptom")
    return rule

@app.post("/map", response_model=MapResponse)
def map_text_to_symptoms(payload: MapRequest, db: Session = Depends(get_db)):
    """
    Deterministic, no-LLM mapping:
    - lowercases
    - simple substring and token match against known symptom keys
    Later we can swap this with a CrewAI agent that is STILL constrained to the known list.
    """
    text = payload.text.lower()
    known = [r.symptom for r in db.query(SymptomRule).all()]
    hits = []
    for s in known:
        # very simple matching to start; we can upgrade later
        pattern = r"\b" + re.escape(s) + r"\b"
        if re.search(pattern, text):
            hits.append(s)
    return {"symptoms": sorted(set(hits))}
