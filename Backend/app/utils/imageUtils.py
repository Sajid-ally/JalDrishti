from PIL import Image
import imagehash


def get_image_hash(image_path: str) -> str:
    img = Image.open(image_path)
    return str(imagehash.phash(img))


def hash_similarity(hash1: str, hash2: str) -> float:
    h1 = imagehash.hex_to_hash(hash1)
    h2 = imagehash.hex_to_hash(hash2)
    max_diff = len(h1.hash) ** 2
    diff = h1 - h2
    similarity = 1 - (diff / max_diff)
    return round(similarity, 3)