import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split, WeightedRandomSampler
from torchvision import datasets, transforms, models
from torch.optim.lr_scheduler import ReduceLROnPlateau

DATA_DIR = "datasets/images"
MODEL_PATH = "trained_models/hazard_classifier.pt"

BATCH_SIZE = 16
EPOCHS = 30
LEARNING_RATE = 1e-4
PATIENCE = 6
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

os.makedirs("trained_models", exist_ok=True)

train_transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(
        brightness=0.2,
        contrast=0.2,
        saturation=0.2,
        hue=0.02
    ),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    ),
])

val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    ),
])

full_dataset = datasets.ImageFolder(DATA_DIR)
class_names = full_dataset.classes

print(f"Detected classes: {class_names}")

train_size = int(0.8 * len(full_dataset))
val_size = len(full_dataset) - train_size

full_train_dataset = datasets.ImageFolder(DATA_DIR, transform=train_transform)
full_val_dataset = datasets.ImageFolder(DATA_DIR, transform=val_transform)

train_dataset, val_dataset = random_split(
    full_train_dataset,
    [train_size, val_size],
    generator=torch.Generator().manual_seed(42)
)

val_dataset.dataset = full_val_dataset

train_labels = [full_dataset.samples[i][1] for i in train_dataset.indices]

class_counts = torch.bincount(torch.tensor(train_labels))
class_weights = 1.0 / class_counts.float()
sample_weights = [class_weights[label] for label in train_labels]

sampler = WeightedRandomSampler(
    sample_weights,
    num_samples=len(sample_weights),
    replacement=True
)

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    sampler=sampler,
    num_workers=0,
    pin_memory=False
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0,
    pin_memory=False
)

print(f"Training images: {len(train_dataset)}")
print(f"Validation images: {len(val_dataset)}")

model = models.mobilenet_v2(weights="IMAGENET1K_V1")

for param in model.features.parameters():
    param.requires_grad = False

for param in model.features[-1].parameters():
    param.requires_grad = True

model.classifier[1] = nn.Linear(model.last_channel, len(class_names))
model = model.to(DEVICE)

optimizer = torch.optim.Adam(
    filter(lambda p: p.requires_grad, model.parameters()),
    lr=LEARNING_RATE
)

criterion = nn.CrossEntropyLoss()

scheduler = ReduceLROnPlateau(
    optimizer,
    mode="max",
    factor=0.5,
    patience=2
)

scaler = torch.amp.GradScaler("cuda", enabled=torch.cuda.is_available())

best_val_acc = 0.0
epochs_without_improvement = 0

for epoch in range(EPOCHS):

    model.train()
    train_loss = 0.0
    train_correct = 0

    for images, labels in train_loader:
        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        optimizer.zero_grad()

        with torch.amp.autocast("cuda", enabled=torch.cuda.is_available()):
            outputs = model(images)
            loss = criterion(outputs, labels)

        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()

        train_loss += loss.item()
        train_correct += (outputs.argmax(1) == labels).sum().item()

    train_acc = train_correct / len(train_dataset)

    model.eval()
    val_correct = 0

    with torch.no_grad():
        for images, labels in val_loader:
            images = images.to(DEVICE)
            labels = labels.to(DEVICE)
            outputs = model(images)
            val_correct += (outputs.argmax(1) == labels).sum().item()

    val_acc = val_correct / len(val_dataset)
    scheduler.step(val_acc)

    print(
        f"Epoch {epoch+1:02d}/{EPOCHS} | "
        f"Train Loss: {train_loss:.4f} | "
        f"Train Acc: {train_acc:.2%} | "
        f"Val Acc: {val_acc:.2%}"
    )

    if val_acc > best_val_acc:
        best_val_acc = val_acc
        epochs_without_improvement = 0

        torch.save(
            {
                "model_state": model.state_dict(),
                "classes": class_names,
                "best_val_accuracy": best_val_acc,
            },
            MODEL_PATH
        )

        print(f"New best model saved! Validation Accuracy: {best_val_acc:.2%}")
    else:
        epochs_without_improvement += 1

    if epochs_without_improvement >= PATIENCE:
        print("Early stopping triggered.")
        break

print("Training complete!")
print(f"Best Validation Accuracy: {best_val_acc:.2%}")
print(f"Best model saved to {MODEL_PATH}")