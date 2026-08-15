import os
import json
import shutil
import subprocess

QUEUE_FILE = "retrain_queue.json"
THRESHOLD = 30

def addCorrectionAndMaybeRetrain(imagePath: str, category: str):
    datasetFolder = f"datasets/images/{category}"
    os.makedirs(datasetFolder, exist_ok=True)

    if os.path.exists(imagePath):
        shutil.copy(imagePath, datasetFolder)

    if os.path.exists(QUEUE_FILE):
        with open(QUEUE_FILE, "r") as f:
            queue = json.load(f)
    else:
        queue = {"count": 0}

    queue["count"] += 1

    with open(QUEUE_FILE, "w") as f:
        json.dump(queue, f)

    if queue["count"] >= THRESHOLD:
        subprocess.run([
            "python",
            "app/models/train_classifier.py"
        ])

        queue["count"] = 0

        with open(QUEUE_FILE, "w") as f:
            json.dump(queue, f)