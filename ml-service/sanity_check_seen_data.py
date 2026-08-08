from app.models.image_model import classify_image
import os

# We'll test both classes: flood and no_flood
for cls in ['flood', 'no_flood']:
    folder = f'datasets/images/{cls}'
    correct = 0
    total = 0

    # Loop through the first 15 images in this class's folder
    for fname in os.listdir(folder)[:15]:
        path = os.path.join(folder, fname)

        # Open the image file in binary mode and read its raw bytes
        with open(path, 'rb') as f:
            result = classify_image(f.read())

        total += 1

        # Check if the model's prediction matches the folder it came from
        is_correct = result['hazard_type'] == cls
        if is_correct:
            correct += 1

        # Print each individual result with a checkmark or X
        mark = "✓" if is_correct else "✗"
        print(f"{cls}/{fname} -> predicted: {result['hazard_type']} (conf: {result['confidence']}) {mark}")

    # After checking all 15 images in this class, print the summary
    print(f"{cls}: {correct}/{total} correct\n")