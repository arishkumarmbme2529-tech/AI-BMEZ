"""
Anomaly detector — preliminary document integrity analysis.

IMPORTANT DISCLAIMER: Results from this module are preliminary indicators only.
They do not constitute a final determination of document authenticity or forgery.
All findings must be reviewed by authorized human officers before any decision.
"""
import os
from datetime import datetime
from typing import Optional


def analyze_document(file_path: str, mime_type: Optional[str], ocr_data: dict = None) -> dict:
    """
    Run anomaly detection checks on a document.
    Returns findings list with severity and explanation.
    """
    findings = []
    metadata = {}

    if not os.path.exists(file_path):
        return {"findings": [], "metadata": {}, "summary": "File not found.", "high_severity_count": 0}

    # 1. File metadata analysis
    try:
        stat = os.stat(file_path)
        mtime = datetime.fromtimestamp(stat.st_mtime)
        ctime = datetime.fromtimestamp(stat.st_ctime)
        metadata["file_size_bytes"] = stat.st_size
        metadata["last_modified"] = mtime.isoformat()
        metadata["created_time"] = ctime.isoformat()

        # Suspicious: modified very recently (within 1 hour of upload)
        time_diff = abs((mtime - ctime).total_seconds())
        if time_diff < 60:
            findings.append({
                "type": "METADATA_ANOMALY",
                "severity": "LOW",
                "description": "File creation and modification timestamps are very close.",
                "detail": f"Time difference: {time_diff:.0f} seconds",
                "note": "This is an indicator only and may be normal for freshly created files.",
            })
    except Exception as e:
        metadata["metadata_error"] = str(e)[:100]

    # 2. Image-specific analysis
    if mime_type and mime_type.startswith("image/"):
        img_findings = _analyze_image(file_path)
        findings.extend(img_findings)

    # 3. PDF metadata analysis
    if mime_type == "application/pdf":
        pdf_findings, pdf_meta = _analyze_pdf(file_path)
        findings.extend(pdf_findings)
        metadata.update(pdf_meta)

    # 4. OCR-based consistency checks
    if ocr_data:
        ocr_findings = _check_ocr_consistency(ocr_data)
        findings.extend(ocr_findings)

    high_count = sum(1 for f in findings if f.get("severity") in ("HIGH", "CRITICAL"))
    total = len(findings)
    if total == 0:
        summary = "No anomalies detected in preliminary analysis."
    elif high_count > 0:
        summary = f"Preliminary analysis detected {total} indicator(s), including {high_count} high-severity item(s). Manual review recommended."
    else:
        summary = f"Preliminary analysis detected {total} minor indicator(s). Review at officer discretion."

    return {
        "findings": findings,
        "metadata": metadata,
        "summary": summary,
        "high_severity_count": high_count,
        "total_findings": total,
        "disclaimer": "AI-generated findings are preliminary indicators only. They do not constitute a determination of forgery.",
    }


def _analyze_image(file_path: str) -> list:
    """Check for image manipulation indicators using OpenCV."""
    findings = []
    try:
        import cv2
        import numpy as np

        img = cv2.imread(file_path)
        if img is None:
            return findings

        # Check for error level analysis (basic compression inconsistency proxy)
        h, w = img.shape[:2]
        if h * w > 0:
            # Convert to YCrCb and check for noise patterns
            ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
            y_channel = ycrcb[:, :, 0]
            # High variance in local regions can indicate splicing
            local_std = np.std(y_channel.astype(float))
            if local_std < 5.0:
                findings.append({
                    "type": "IMAGE_UNIFORMITY",
                    "severity": "LOW",
                    "description": "Image has unusually low variation (may indicate solid-color areas or heavy compression).",
                    "detail": f"Luminance std: {local_std:.2f}",
                    "note": "Low variation alone does not indicate manipulation.",
                })

        # Blur detection (Laplacian variance)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        if blur_score < 50:
            findings.append({
                "type": "LOW_QUALITY",
                "severity": "LOW",
                "description": "Image appears blurry or low resolution.",
                "detail": f"Sharpness score: {blur_score:.1f}",
                "note": "Low quality may reduce OCR accuracy and document readability.",
            })
    except ImportError:
        pass
    except Exception as e:
        findings.append({
            "type": "ANALYSIS_ERROR",
            "severity": "INFO",
            "description": "Image analysis could not be completed.",
            "detail": str(e)[:100],
        })
    return findings


def _analyze_pdf(file_path: str) -> tuple:
    """Analyze PDF metadata for anomalies."""
    findings = []
    meta = {}
    try:
        import fitz
        with fitz.open(file_path) as doc:
            pdf_meta = doc.metadata
            meta["pdf_creator"] = pdf_meta.get("creator", "")
            meta["pdf_producer"] = pdf_meta.get("producer", "")
            meta["pdf_author"] = pdf_meta.get("author", "")
            meta["pdf_creation_date"] = pdf_meta.get("creationDate", "")
            meta["pdf_mod_date"] = pdf_meta.get("modDate", "")
            meta["page_count"] = doc.page_count

            # Suspicious: modification date after creation date by significant margin
            creation = pdf_meta.get("creationDate", "")
            modified = pdf_meta.get("modDate", "")
            if creation and modified and creation != modified:
                findings.append({
                    "type": "PDF_METADATA",
                    "severity": "LOW",
                    "description": "PDF creation and modification dates differ.",
                    "detail": f"Created: {creation[:20]}, Modified: {modified[:20]}",
                    "note": "Modified PDFs are not inherently suspicious — many legitimate tools modify metadata.",
                })
    except Exception as e:
        meta["pdf_analysis_error"] = str(e)[:100]
    return findings, meta


def _check_ocr_consistency(ocr_data: dict) -> list:
    """Check OCR-extracted fields for date inconsistencies."""
    findings = []
    issue_date_str = ocr_data.get("issue_date", "")
    expiry_date_str = ocr_data.get("expiry_date", "")
    institution_name = ocr_data.get("institution_name", "")

    # Date logic check
    if issue_date_str and expiry_date_str:
        try:
            from dateutil import parser
            issue = parser.parse(issue_date_str, dayfirst=True)
            expiry = parser.parse(expiry_date_str, dayfirst=True)
            if expiry < issue:
                findings.append({
                    "type": "DATE_INCONSISTENCY",
                    "severity": "HIGH",
                    "description": "Expiry date appears to be before the issue date.",
                    "detail": f"Issue: {issue_date_str}, Expiry: {expiry_date_str}",
                    "note": "This inconsistency warrants manual review.",
                })
            elif expiry < datetime.utcnow():
                findings.append({
                    "type": "DOCUMENT_EXPIRED",
                    "severity": "HIGH",
                    "description": "Document expiry date has passed.",
                    "detail": f"Expiry: {expiry_date_str}",
                    "note": "Expired documents may not be valid for regulatory submissions.",
                })
        except Exception:
            pass

    return findings
