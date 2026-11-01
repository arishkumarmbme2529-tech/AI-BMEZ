"""
OCR Processor — extracts text and structured fields from documents.
Uses pytesseract with PyMuPDF for PDFs, OpenCV for image preprocessing.
"""
import re
import os
from typing import Optional


def process_document_ocr(file_path: str, mime_type: str) -> dict:
    """
    Process a document with OCR and return structured extraction results.
    Falls back gracefully if Tesseract is not installed.
    """
    extracted_text = ""
    engine = "unavailable"
    confidence = 0.0

    try:
        if mime_type == "application/pdf":
            extracted_text = _extract_pdf_text(file_path)
            engine = "pymupdf"
            confidence = 0.85 if extracted_text.strip() else 0.0
            # Try OCR on scanned PDFs
            if not extracted_text.strip():
                extracted_text = _ocr_pdf(file_path)
                engine = "tesseract+pymupdf"
                confidence = 0.70
        elif mime_type and mime_type.startswith("image/"):
            extracted_text = _ocr_image(file_path)
            engine = "tesseract"
            confidence = 0.75 if extracted_text.strip() else 0.0
    except Exception as e:
        extracted_text = f"[OCR processing note: {str(e)[:200]}]"
        engine = "error"
        confidence = 0.0

    # Extract structured fields
    structured = _extract_fields(extracted_text)
    structured["raw_text_length"] = len(extracted_text)

    return {
        "extracted_text": extracted_text,
        "structured_data": structured,
        "institution_name": structured.get("institution_name"),
        "cert_number": structured.get("cert_number"),
        "issue_date": structured.get("issue_date"),
        "expiry_date": structured.get("expiry_date"),
        "issuing_authority": structured.get("issuing_authority"),
        "confidence": confidence,
        "engine": engine,
    }


def _extract_pdf_text(file_path: str) -> str:
    """Extract text from a PDF using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
        text_parts = []
        with fitz.open(file_path) as doc:
            for page in doc:
                text_parts.append(page.get_text())
        return "\n".join(text_parts)
    except ImportError:
        return "[PyMuPDF not available]"
    except Exception as e:
        return f"[PDF extraction error: {str(e)[:100]}]"


def _ocr_pdf(file_path: str) -> str:
    """OCR a PDF (scanned) via Tesseract by rendering pages."""
    try:
        import fitz
        import pytesseract
        from PIL import Image
        import io

        text_parts = []
        with fitz.open(file_path) as doc:
            for page in doc:
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_bytes))
                text = pytesseract.image_to_string(img, lang="eng")
                text_parts.append(text)
        return "\n".join(text_parts)
    except Exception as e:
        return f"[Scanned PDF OCR note: {str(e)[:100]}]"


def _ocr_image(file_path: str) -> str:
    """OCR an image file using Tesseract + OpenCV preprocessing."""
    try:
        import pytesseract
        import cv2
        import numpy as np
        from PIL import Image

        # Preprocess with OpenCV
        img = cv2.imread(file_path)
        if img is None:
            img_pil = Image.open(file_path)
            return pytesseract.image_to_string(img_pil, lang="eng")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Adaptive threshold for better OCR
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        pil_img = Image.fromarray(thresh)
        return pytesseract.image_to_string(pil_img, lang="eng")
    except ImportError:
        # Try PIL-only
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(file_path)
            return pytesseract.image_to_string(img, lang="eng")
        except Exception as e:
            return f"[Image OCR note: {str(e)[:100]}]"
    except Exception as e:
        return f"[OCR error: {str(e)[:100]}]"


def _extract_fields(text: str) -> dict:
    """Use regex to extract common document fields from OCR text."""
    fields = {}

    # Institution name — look for patterns like "Name of Institution:" or standalone caps lines
    inst_patterns = [
        r"(?:institution|college|university|institute)\s*(?:name|of)\s*:?\s*([A-Z][^\n]{5,80})",
        r"(?:name)\s*of\s*(?:the\s*)?(?:institution|college)\s*:?\s*([A-Z][^\n]{5,80})",
    ]
    for pat in inst_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            fields["institution_name"] = m.group(1).strip()[:100]
            break

    # Certificate / registration number
    cert_patterns = [
        r"(?:certificate|cert|reg(?:istration)?|approval)\s*(?:no|number|#)\s*[:\-]?\s*([A-Z0-9\-/]{4,30})",
        r"(?:no|number)\s*[:\-]\s*([A-Z0-9\-/]{4,30})",
    ]
    for pat in cert_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            fields["cert_number"] = m.group(1).strip()[:50]
            break

    # Issue date
    date_pat = r"(?:issue[d]?\s*(?:on|date)|date\s*of\s*issue)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+\w+\s+\d{4})"
    m = re.search(date_pat, text, re.IGNORECASE)
    if m:
        fields["issue_date"] = m.group(1).strip()

    # Expiry date
    exp_pat = r"(?:expir[ey]\s*(?:on|date)|valid\s*(?:till|upto|until)|validity)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+\w+\s+\d{4})"
    m = re.search(exp_pat, text, re.IGNORECASE)
    if m:
        fields["expiry_date"] = m.group(1).strip()

    # Issuing authority
    auth_patterns = [
        r"(?:issued\s*by|issuing\s*authority|signed\s*by)\s*[:\-]?\s*([^\n]{5,80})",
        r"(?:chairman|director|registrar|secretary)\s*[,\n]?\s*([A-Z][^\n]{5,60})",
    ]
    for pat in auth_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            fields["issuing_authority"] = m.group(1).strip()[:100]
            break

    return fields
