from sqlalchemy.orm import Session
from .models import SymptomRule

DEFAULT_RULES = [
    {
        "symptom": "chest pain",
        "follow_up_questions": [
            "When did the chest pain start?",
            "Is the pain constant or does it come and go?",
            "Does the pain get worse with activity or exercise?",
            "Can you describe the type of pain (sharp, dull, burning, pressure)?",
            "Does it radiate to arm, neck, jaw, or back?",
            "On a scale of 1-10, how intense is the pain?"
        ]
    },
    {
        "symptom": "shortness of breath",
        "follow_up_questions": [
            "How long have you had shortness of breath?",
            "Does it occur at rest or only with activity?",
            "Do you have cough or wheezing?",
            "Does lying flat make it worse?",
            "Any swelling in legs or feet?",
            "Do you wake up at night short of breath?"
        ]
    },
    {
        "symptom": "fatigue",
        "follow_up_questions": [
            "How long have you felt unusually tired?",
            "Is it constant or intermittent?",
            "Does it interfere with daily activities?",
            "Do you feel tired even after sleep?",
            "Any appetite or weight changes?",
            "Any dizziness or lightheadedness?"
        ]
    },
    {
        "symptom": "palpitations",
        "follow_up_questions": [
            "When do you notice your heart racing?",
            "How long do episodes last?",
            "Any dizziness or lightheadedness?",
            "Any triggers (activity/emotion/caffeine)?",
            "Any chest discomfort?",
            "Any fainting episodes?"
        ]
    },
    {
        "symptom": "dizziness",
        "follow_up_questions": [
            "When did the dizziness start?",
            "Does it occur on standing up?",
            "Room spinning (vertigo)?",
            "Any new medications?",
            "Any changes in hearing?",
            "Any nausea with dizziness?"
        ]
    },
]

def seed_rules(db: Session):
    for rule in DEFAULT_RULES:
        existing = db.get(SymptomRule, rule["symptom"])
        if not existing:
            db.add(SymptomRule(
                symptom=rule["symptom"],
                follow_up_questions=rule["follow_up_questions"]
            ))
    db.commit()
