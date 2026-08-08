import os
import random
import shutil

random.seed(42)

source = "datasets/images"
train_dir = "datasets/train"
val_dir = "datasets/val"

classes = ["flood", "no_flood"]

for cls in classes:
    src = os.path.join(source, cls)
    train_cls = os.path.join(train_dir, cls)
    val_cls = os.path.join(val_dir, cls)

    os.makedirs(train_cls, exist_ok=True)
    os.makedirs(val_cls, exist_ok=True)

    images = [f for f in os.listdir(src)
              if f.lower().endswith((".jpg", ".jpeg", ".png"))]

    random.shuffle(images)

    split = int(0.8 * len(images))   # 80% train, 20% validation

    for img in images[:split]:
        shutil.copy(os.path.join(src, img), os.path.join(train_cls, img))

    for img in images[split:]:
        shutil.copy(os.path.join(src, img), os.path.join(val_cls, img))

print("Dataset split completed.")