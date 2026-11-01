"""
Hash engine — SHA-256 exact hashing + perceptual hashing for duplicate detection.
"""
import hashlib
import os
from typing import Optional


def compute_hashes(file_path: str, mime_type: Optional[str] = None) -> dict:
    """Compute SHA-256 and perceptual hash for a file."""
    result = {"sha256": None, "phash": None, "file_size": None}

    if not os.path.exists(file_path):
        return result

    # SHA-256
    try:
        with open(file_path, "rb") as f:
            content = f.read()
        result["sha256"] = hashlib.sha256(content).hexdigest()
        result["file_size"] = len(content)
    except Exception:
        pass

    # Perceptual hash (for images only)
    if mime_type and mime_type.startswith("image/"):
        try:
            import imagehash
            from PIL import Image
            img = Image.open(file_path)
            result["phash"] = str(imagehash.phash(img))
            result["dhash"] = str(imagehash.dhash(img))
        except Exception:
            pass

    return result


def find_duplicates(current_hashes: dict, all_hashes: list) -> dict:
    """
    Compare current document hashes against all others.
    Returns match type and details.
    """
    sha256 = current_hashes.get("sha256")
    phash = current_hashes.get("phash")

    # Exact match via SHA-256
    if sha256:
        for h in all_hashes:
            if h.get("sha256") and h["sha256"] == sha256:
                return {
                    "match_type": "EXACT",
                    "duplicate_doc_id": h["document_id"],
                    "similarity_score": 1.0,
                    "method": "SHA-256",
                }

    # Near-duplicate via perceptual hash
    if phash:
        try:
            import imagehash
            current_ph = imagehash.hex_to_hash(phash)
            best_score = 0.0
            best_doc_id = None

            for h in all_hashes:
                if h.get("phash"):
                    try:
                        other_ph = imagehash.hex_to_hash(h["phash"])
                        diff = current_ph - other_ph
                        # phash distance 0–64; similarity = 1 - diff/64
                        similarity = max(0.0, 1.0 - diff / 64.0)
                        if similarity > best_score:
                            best_score = similarity
                            best_doc_id = h["document_id"]
                    except Exception:
                        continue

            if best_score >= 0.95:
                return {
                    "match_type": "NEAR_DUPLICATE",
                    "duplicate_doc_id": best_doc_id,
                    "similarity_score": round(best_score, 3),
                    "method": "perceptual_hash",
                }
        except Exception:
            pass

    return {"match_type": "UNIQUE", "duplicate_doc_id": None, "similarity_score": 0.0, "method": "hash"}
