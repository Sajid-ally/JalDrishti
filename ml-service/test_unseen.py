from app.models.image_model import classify_image
import os

# Point this at the NEW test folder, not the training data folder
TEST_DIR = "datasets/test"

for cls in os.listdir(TEST_DIR):          # loops through 'flood' and 'no_flood' subfolders
    folder = os.path.join(TEST_DIR, cls)
    correct = 0
    total = 0

    for fname in os.listdir(folder):
        path = os.path.join(folder, fname)

        with open(path, 'rb') as f:
            result = classify_image(f.read())

        total += 1
        is_correct = result['hazard_type'] == cls
        if is_correct:
            correct += 1

        mark = "✓" if is_correct else "✗"
        print(f"{cls}/{fname} -> predicted: {result['hazard_type']} (conf: {result['confidence']}) {mark}")

    if total > 0:
        print(f"{cls}: {correct}/{total} correct ({correct/total:.0%})\n")
    else:
        print(f"{cls}: no images found — did you add test images?\n")