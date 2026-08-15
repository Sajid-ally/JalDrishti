"""
Severity Predictor
--------------------
Rule-based (not ML) - maps hazard type + confidence into a severity score.
We don't have labeled severity data to train a model on, so this uses
domain judgment instead, same approach as the priority ranker.
"""

# Base severity per hazard type (0 = none, 5 = most severe)
SEVERITY_MAP = {
    "flood": 4,
    "no_flood": 0,
}

def predict_severity(hazard_type: str, confidence: float) -> int:
    base_severity = SEVERITY_MAP.get(hazard_type, 1)

    # If the model isn't very confident, don't fully commit to high severity -
    # nudge it down slightly so uncertain detections don't over-alarm officials
    if confidence < 0.6:
        base_severity = max(0, base_severity - 1)

    return base_severity