from app.models.image_model import classify_image

with open(r"datasets\images\no_flood\apartment_1298.jpg", "rb") as f:
    result = classify_image(f.read())

print(result)