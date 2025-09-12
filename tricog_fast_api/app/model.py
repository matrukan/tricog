from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import JSONB
from .database import Base

class SymptomRule(Base):
    __tablename__ = "symptom_rules"
    # canonical symptom key (e.g., "chest pain")
    symptom = Column(String, primary_key=True, index=True)
    # array of strings
    follow_up_questions = Column(JSONB, nullable=False, default=list)
