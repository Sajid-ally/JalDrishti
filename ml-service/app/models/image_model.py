"""
Loads the trained flood classifier and runs predictions on new images.
This file is imported by the FastAPI route (detect.py) — it does NOT
run training again, it just loads the already-saved model and uses it.
"""

import torch
import torch.nn.functional as F
from torchvision import transforms, models
from PIL import Image
import io

DEVICE = "cpu"   # inference is light enough to run on CPU even without a GPU

# Load the saved checkpoint (weights + class names) from training
checkpoint = torch.load("trained_models/hazard_classifier.pt", map_location=DEVICE)
class_names = checkpoint["classes"]   # e.g. ['flood', 'no_flood']

# Rebuild the same model architecture used during training,
# then load our trained weights into it
model = models.mobilenet_v2()
model.classifier[1] = torch.nn.Linear(model.last_channel, len(class_names))
model.load_state_dict(checkpoint["model_state"])
model.eval()   # inference mode — disables things like dropout used only during training

# Must match EXACTLY the preprocessing used during training,
# otherwise the model will get confused by differently-formatted input
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


def classify_image(image_bytes: bytes) -> dict:
    """
    Takes raw image bytes (e.g. from an uploaded file),
    returns the predicted hazard type and confidence score.
    """
    # Convert raw bytes into a PIL image, then apply the same preprocessing
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = transform(image).unsqueeze(0)  # add a "batch" dimension (model expects batches)

    with torch.no_grad():   # disables gradient tracking — we're not training, just predicting
        outputs = model(tensor)             # raw prediction scores
        probs = F.softmax(outputs, dim=1)[0]  # convert scores into probabilities (0-100%)
        confidence, pred_idx = torch.max(probs, dim=0)  # pick the highest-probability class

    return {
        "hazard_type": class_names[pred_idx.item()],
        "confidence": round(confidence.item(), 2),
    }