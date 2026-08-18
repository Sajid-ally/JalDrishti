import io
import os
from pathlib import Path
import torch
import torch.nn.functional as F
from torchvision import transforms, models
from PIL import Image

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Locate model file relative to package root or env var
DEFAULT_MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "trained_models" / "hazard_classifier.pt"
MODEL_PATH = os.getenv("MODEL_PATH", str(DEFAULT_MODEL_PATH))

if not os.path.exists(MODEL_PATH):
    # Try current working directory
    if os.path.exists("trained_models/hazard_classifier.pt"):
        MODEL_PATH = "trained_models/hazard_classifier.pt"

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
    weights_only=False,
)

class_names = checkpoint["classes"]

model = models.mobilenet_v2()

model.classifier[1] = torch.nn.Linear(
    model.last_channel,
    len(class_names),
)

model.load_state_dict(checkpoint["model_state"])
model.to(DEVICE)
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225],
    ),
])

SEVERITY_MAP = {
    "flooding": 5,
    "drainage_problem": 3,
    "pond_lake_problem": 3,
    "normal": 0,
}


def classify_image(image_bytes: bytes) -> dict:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    tensor = transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        outputs = model(tensor)
        probabilities = F.softmax(outputs, dim=1)[0]
        top2_conf, top2_idx = torch.topk(probabilities, 2)

    predicted = class_names[top2_idx[0].item()]
    confidence = float(top2_conf[0].item())

    second_prediction = class_names[top2_idx[1].item()]
    second_confidence = float(top2_conf[1].item())

    severity = SEVERITY_MAP.get(predicted, 0)

    return {
        "hazard_type": predicted,
        "confidence": round(confidence, 4),
        "second_prediction": second_prediction,
        "second_confidence": round(second_confidence, 4),
        "severity": severity,
    }
