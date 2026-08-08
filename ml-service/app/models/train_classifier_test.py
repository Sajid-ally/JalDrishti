"""
Flood Detection Model Training Script
---------------------------------------
Algorithm used: Transfer Learning with MobileNetV2 (CNN backbone)

WHY transfer learning?
A Convolutional Neural Network (CNN) trained from scratch needs
millions of images to learn basic vision (edges, shapes, textures).
MobileNetV2 is already trained on 1.4 million images (ImageNet dataset)
and already understands these basics. We REUSE that knowledge and only
train a small new layer on top for our specific task: flood vs no-flood.
This is why we can get good results with only ~50-100 images per class.
"""

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models

# ---------------------------------------------------
# STEP 1: CONFIGURATION
# ---------------------------------------------------
DATA_DIR = "datasets/images"   # folder containing subfolders: flood/, no_flood/
BATCH_SIZE = 16                 # how many images we process at once before updating the model
EPOCHS = 10                     # how many times we go through the ENTIRE dataset
LEARNING_RATE = 1e-3             # how big a step we take when correcting the model's mistakes
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"   # use GPU if available, else CPU

# ---------------------------------------------------
# STEP 2: IMAGE PREPROCESSING
# ---------------------------------------------------
# Every image must be transformed into the exact format the model expects:
# - Resize to 224x224 (the size MobileNetV2 was originally trained on)
# - RandomHorizontalFlip: artificially creates more training variety by
#   flipping images left-right sometimes (helps the model generalize better,
#   since a flood photo flipped horizontally is still a flood photo)
# - ToTensor: converts the image (pixels 0-255) into a PyTorch tensor (0-1 range)
# - Normalize: scales pixel values using the same mean/std MobileNetV2 was
#   originally trained with — this is required for the pretrained weights to work correctly
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# ---------------------------------------------------
# STEP 3: LOAD THE DATASET
# ---------------------------------------------------
# ImageFolder automatically reads folder names as class labels.
# Example: datasets/images/flood/*.jpg      -> label "flood"
#          datasets/images/no_flood/*.jpg   -> label "no_flood"
dataset = datasets.ImageFolder(DATA_DIR, transform=transform)
class_names = dataset.classes
print("Detected classes:", class_names)   # should print ['flood', 'no_flood']

# DataLoader feeds the dataset to the model in small batches, shuffled each epoch
# (shuffling prevents the model from memorizing the ORDER of images instead of
# actually learning the visual patterns)
loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

# ---------------------------------------------------
# STEP 4: LOAD THE PRETRAINED MODEL (transfer learning)
# ---------------------------------------------------
# MobileNetV2 pretrained on ImageNet (1.4 million images, 1000 categories)
model = models.mobilenet_v2(weights="IMAGENET1K_V1")

# FREEZE the base layers: we do NOT want to retrain the part of the model
# that already knows how to detect edges/shapes/textures. Freezing means
# "don't update these weights during training" — this is what makes
# transfer learning fast and effective with small datasets.
for param in model.features.parameters():
    param.requires_grad = False

# REPLACE the final classification layer.
# The original model was built to choose between 1000 ImageNet categories.
# We replace that final layer with a new one that chooses between
# OUR classes (flood / no_flood). This new layer starts untrained (random)
# and is the ONLY part that gets updated during training.
model.classifier[1] = nn.Linear(model.last_channel, len(class_names))
model = model.to(DEVICE)

# ---------------------------------------------------
# STEP 5: DEFINE HOW THE MODEL LEARNS
# ---------------------------------------------------
# Optimizer: Adam adjusts the model's weights to reduce mistakes.
# We ONLY pass model.classifier.parameters() because that's the only
# part we unfroze — this keeps training fast since we're updating
# a small number of weights, not the whole network.
optimizer = torch.optim.Adam(model.classifier.parameters(), lr=LEARNING_RATE)

# Loss function: CrossEntropyLoss measures how wrong the model's
# predicted probabilities are compared to the true label.
# Lower loss = better predictions.
criterion = nn.CrossEntropyLoss()

# ---------------------------------------------------
# STEP 6: TRAINING LOOP
# ---------------------------------------------------
# An "epoch" = one full pass through all training images.
# We do this multiple times so the model can gradually improve.
for epoch in range(EPOCHS):
    model.train()
    total_loss = 0
    correct = 0

    for batch_idx, (images, labels) in enumerate(loader):
        images, labels = images.to(DEVICE), labels.to(DEVICE)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        correct += (outputs.argmax(1) == labels).sum().item()

        print(f"  Epoch {epoch+1} — batch {batch_idx+1}/{len(loader)} — batch loss: {loss.item():.4f}")

    accuracy = correct / len(dataset)
    print(f"Epoch {epoch+1}/{EPOCHS} — Loss: {total_loss:.4f} — Accuracy: {accuracy:.2%}")

# ---------------------------------------------------
# STEP 7: SAVE THE TRAINED MODEL
# ---------------------------------------------------
# We save both the learned weights AND the class name order,
# because we'll need class_names again later to interpret predictions.
torch.save(
    {"model_state": model.state_dict(), "classes": class_names},
    "app/models/hazard_classifier.pt"
)
print("Training complete. Model saved to app/models/hazard_classifier.pt")