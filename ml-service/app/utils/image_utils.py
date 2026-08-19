"""
Image similarity utilities — used to detect duplicate image uploads.
Uses perceptual hashing (not exact byte comparison), so slightly
resized/recompressed copies of the same photo still match.
"""

from PIL import Image

def get_image_hash(image_path: str) -> str:
    """Returns a perceptual hash string for an image."""
    try:
        import imagehash
        img = Image.open(image_path)
        return str(imagehash.phash(img))
    except Exception:
        pass

    try:
        img = Image.open(image_path).convert("L").resize((9, 8), Image.Resampling.LANCZOS)
        pixels = list(img.getdata())
        diff = []
        for row in range(8):
            for col in range(8):
                diff.append(pixels[row * 9 + col] > pixels[row * 9 + col + 1])
        decimal_val = 0
        hex_str = []
        for idx, val in enumerate(diff):
            if val:
                decimal_val += 2 ** (idx % 4)
            if (idx % 4) == 3:
                hex_str.append(hex(decimal_val)[2:])
                decimal_val = 0
        return "".join(hex_str)
    except Exception:
        return "0000000000000000"

def is_duplicate_image(hash1: str, hash2: str, threshold: int = 5) -> bool:
    if not hash1 or not hash2:
        return False
    try:
        import imagehash
        h1 = imagehash.hex_to_hash(hash1)
        h2 = imagehash.hex_to_hash(hash2)
        return (h1 - h2) <= threshold
    except Exception:
        pass
    try:
        h1_bin = bin(int(hash1, 16))[2:].zfill(len(hash1) * 4)
        h2_bin = bin(int(hash2, 16))[2:].zfill(len(hash2) * 4)
        diff_bits = sum(b1 != b2 for b1, b2 in zip(h1_bin, h2_bin))
        return diff_bits <= threshold
    except Exception:
        return False