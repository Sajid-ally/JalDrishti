from PIL import Image

def get_image_hash(image_path: str) -> str:
    """Computes a 64-bit difference perceptual hash (dHash) using Pillow."""
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


def hash_similarity(hash1: str, hash2: str) -> float:
    """Calculates similarity score (0.0 to 1.0) using Hamming distance."""
    if not hash1 or not hash2 or len(hash1) != len(hash2):
        return 0.0
    try:
        h1_bin = bin(int(hash1, 16))[2:].zfill(len(hash1) * 4)
        h2_bin = bin(int(hash2, 16))[2:].zfill(len(hash2) * 4)
        diff_bits = sum(b1 != b2 for b1, b2 in zip(h1_bin, h2_bin))
        similarity = 1.0 - (diff_bits / len(h1_bin))
        return round(similarity, 3)
    except Exception:
        return 0.0