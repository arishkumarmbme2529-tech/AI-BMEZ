"""
Image classifier — quality scoring and category classification for infrastructure evidence.
"""
import os
from typing import Optional


def classify_image(file_path: str) -> dict:
    """
    Analyze infrastructure image for quality and classify its category.
    Returns observations and quality score.
    
    Note: AI observations are advisory only. They cannot establish actual
    infrastructure compliance without appropriate verification and inspection.
    """
    observations = {}
    quality_score = None
    category_hint = None

    if not os.path.exists(file_path):
        return {"observations": {"error": "File not found"}, "quality_score": 0.0}

    try:
        import cv2
        import numpy as np

        img = cv2.imread(file_path)
        if img is None:
            return {"observations": {"error": "Cannot read image"}, "quality_score": 0.0}

        h, w = img.shape[:2]
        observations["resolution"] = f"{w}x{h}"
        observations["megapixels"] = round((w * h) / 1_000_000, 2)

        # Quality: sharpness (Laplacian variance)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        observations["sharpness_score"] = round(float(sharpness), 2)

        # Quality: brightness
        brightness = float(np.mean(gray))
        observations["brightness"] = round(brightness, 2)

        # Compute composite quality score (0-100)
        sharpness_norm = min(1.0, sharpness / 500.0)
        brightness_norm = 1.0 - abs(brightness - 128) / 128.0  # best at 128
        res_norm = min(1.0, (w * h) / (1920 * 1080))

        quality_score = round((sharpness_norm * 0.5 + brightness_norm * 0.3 + res_norm * 0.2) * 100, 1)
        observations["quality_score"] = quality_score

        # Quality interpretation
        if quality_score >= 70:
            observations["quality_assessment"] = "Good"
        elif quality_score >= 40:
            observations["quality_assessment"] = "Acceptable"
        else:
            observations["quality_assessment"] = "Poor — consider re-uploading a clearer image"

        observations["disclaimer"] = (
            "AI image quality assessment is advisory. "
            "Physical inspection is required to verify actual infrastructure compliance."
        )

    except ImportError:
        # Fallback: basic file-size heuristic
        size = os.path.getsize(file_path)
        quality_score = min(100.0, size / 50000 * 50)
        observations["quality_assessment"] = "Assessment requires OpenCV"
        observations["file_size_bytes"] = size
    except Exception as e:
        observations["error"] = str(e)[:100]
        quality_score = 0.0

    return {
        "observations": observations,
        "quality_score": quality_score,
        "category_hint": category_hint,
    }
