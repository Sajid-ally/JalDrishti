"""
Image similarity utilities — used to detect duplicate image uploads.
Uses perceptual hashing (not exact byte comparison), so slightly
resized/recompressed copies of the same photo still match.
"""

from PIL import Image
import imagehash

def get_image_hash(image_path: str) -> str:
    """Returns a perceptual hash string for an image."""
    img = Image.open(image_path)
    return str(imagehash.phash(img))

def is_duplicate_image(hash1: str, hash2: str, threshold: int = 5) -> bool:
    """
    Compares two perceptual hashes. Lower difference = more similar.
    threshold=5 is a reasonable default — near-identical images
    (same photo, recompressed/resized) will have small differences.
    """
    h1 = imagehash.hex_to_hash(hash1)
    h2 = imagehash.hex_to_hash(hash2)
    return (h1 - h2) <= threshold