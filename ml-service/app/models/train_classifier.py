"""
CoastalEye - Flood vs No-Flood Image Classifier

Algorithm: Transfer Learning with MobileNetV2 (CNN backbone)

Dataset structure:
datasets/
└── images/
    ├── flood/
    └── no_flood/

This script:
- Uses MobileNetV2 pretrained on ImageNet
- Splits the dataset into 80% training and 20% validation
- Trains only the final classification layer
- Reports training and validation accuracy
- Saves the best model based on validation accuracy
"""

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms, models

# ---------------------------------------------------
# STEP 1: CONFIGURATION
# ---------------------------------------------------

DATA_DIR = "datasets/images"
BATCH_SIZE = 16
EPOCHS = 10
LEARNING_RATE = 1e-3
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ---------------------------------------------------
# STEP 2: IMAGE PREPROCESSING
# ---------------------------------------------------

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

# ---------------------------------------------------
# STEP 3: LOAD DATASET
# ---------------------------------------------------

full_dataset = datasets.ImageFolder(DATA_DIR, transform=transform)
class_names = full_dataset.classes

print("Detected classes:", class_names)

# 80% training, 20% validation split
train_size = int(0.8 * len(full_dataset))
val_size = len(full_dataset) - train_size

train_dataset, val_dataset = random_split(
    full_dataset,
    [train_size, val_size],
    generator=torch.Generator().manual_seed(42)
)

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False
)

print(f"Training images: {len(train_dataset)}")
print(f"Validation images: {len(val_dataset)}")

# ---------------------------------------------------
# STEP 4: LOAD PRETRAINED MODEL
# ---------------------------------------------------

model = models.mobilenet_v2(weights="IMAGENET1K_V1")

# Freeze feature extraction layers
for param in model.features.parameters():
    param.requires_grad = False

# Replace the final classifier
model.classifier[1] = nn.Linear(
    model.last_channel,
    len(class_names)
)

model = model.to(DEVICE)

# ---------------------------------------------------
# STEP 5: OPTIMIZER AND LOSS FUNCTION
# ---------------------------------------------------

optimizer = torch.optim.Adam(
    model.classifier.parameters(),
    lr=LEARNING_RATE
)

criterion = nn.CrossEntropyLoss()

# ---------------------------------------------------
# STEP 6: TRAINING + VALIDATION LOOP
# ---------------------------------------------------

best_val_acc = 0.0

for epoch in range(EPOCHS):

    # ---------------- TRAIN ----------------
    model.train()

    train_loss = 0.0
    train_correct = 0

    for batch_idx, (images, labels) in enumerate(train_loader):

        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        optimizer.zero_grad()

        outputs = model(images)

        loss = criterion(outputs, labels)

        loss.backward()

        optimizer.step()

        train_loss += loss.item()

        train_correct += (
            outputs.argmax(1) == labels
        ).sum().item()

        print(
            f"Epoch {epoch+1} | Batch {batch_idx+1}/{len(train_loader)} | Loss: {loss.item():.4f}"
        )

    train_acc = train_correct / len(train_dataset)

    # ---------------- VALIDATION ----------------
    model.eval()

    val_correct = 0

    with torch.no_grad():

        for images, labels in val_loader:

            images = images.to(DEVICE)
            labels = labels.to(DEVICE)

            outputs = model(images)

            val_correct += (
                outputs.argmax(1) == labels
            ).sum().item()

    val_acc = val_correct / len(val_dataset)

    print(
        f"Epoch {epoch+1}/{EPOCHS} | "
        f"Train Loss: {train_loss:.4f} | "
        f"Train Acc: {train_acc:.2%} | "
        f"Val Acc: {val_acc:.2%}"
    )

    # Save the best model
    if val_acc > best_val_acc:

        best_val_acc = val_acc

        torch.save(
            {
                "model_state": model.state_dict(),
                "classes": class_names,
                "best_val_accuracy": best_val_acc,
            },
            "app/models/hazard_classifier.pt"
        )

        print(
            f"New best model saved! Validation Accuracy: {best_val_acc:.2%}"
        )

# ---------------------------------------------------
# STEP 7: FINAL SUMMARY
# ---------------------------------------------------

print("Training complete!")
print(f"Best Validation Accuracy: {best_val_acc:.2%}")
print("Best model saved to app/models/hazard_classifier.pt")