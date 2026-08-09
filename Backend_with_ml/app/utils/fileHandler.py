import os
import uuid
import shutil

from fastapi import UploadFile, HTTPException

# Allowed image formats
ALLOWED_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp"
}

# Maximum image size (10 MB)
MAX_FILE_SIZE = 10 * 1024 * 1024


def saveImage(file: UploadFile, folder: str = "uploads") -> str:
    """
    Saves an uploaded image and returns its path.
    """

    # Create upload folder if it doesn't exist
    os.makedirs(folder, exist_ok=True)

    # Check extension
    extension = file.filename.split(".")[-1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only jpg, jpeg, png and webp images are allowed."
        )

    # Generate unique filename
    uniqueFilename = f"{uuid.uuid4()}.{extension}"

    filePath = os.path.join(folder, uniqueFilename)

    # Save image
    with open(filePath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Check image size
    if os.path.getsize(filePath) > MAX_FILE_SIZE:

        os.remove(filePath)

        raise HTTPException(
            status_code=400,
            detail="Image size should be less than 10 MB."
        )

    # Return path with forward slashes
    return filePath.replace("\\", "/")