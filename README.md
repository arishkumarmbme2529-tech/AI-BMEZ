# AI-Powered Smart Institute Document Management, Authentication & Regulatory Compliance Verification System

**Smart India Hackathon 2026 | Problem Statement ID: 26261**  
**Organization:** All India Council for Technical Education (AICTE) — Regulation Bureau  
**Category:** Software | **Theme:** Smart Automation

---

## 1. Platform Overview

An enterprise-grade full-stack regulatory technology platform that automates institutional application validation, document upload & SHA-256 hashing, OCR-based field extraction, cryptographic & perceptual duplicate detection, explainable preliminary anomaly detection, configurable rule-based compliance verification, AI-assisted infrastructure evidence review, official verification adapters, renewal lifecycle tracking, immutable audit trails, and ReportLab PDF validation report generation.

> **Important Notice:** All seeded institutions, applications, compliance rules, and adapter responses are **clearly labelled synthetic demonstration records** created for SIH 2026 Problem Statement #26261 and do not represent live AICTE government data or official regulatory determinations.

---

## 2. Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons, React Router v6, Axios, React Dropzone
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2, JWT (`python-jose`), Bcrypt (`passlib`)
- **Database:** PostgreSQL (production) / SQLite (`aicte_platform.db` zero-config local development default)
- **AI & Document Processing:** PyMuPDF (`fitz`), Tesseract OCR (`pytesseract`), OpenCV (`cv2`), Pillow, `imagehash` (pHash/dHash), `hashlib` (SHA-256)
- **Reports:** ReportLab PDF Engine

---

## 3. Quick Start (Local Development)

### Prerequisites
Ensure **Python 3.10+** and **Node.js 18+** are installed on your machine.

### Step 1 — Start the FastAPI Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
- The backend starts at `http://localhost:8000`
- Interactive Swagger API documentation: `http://localhost:8000/docs`
- On first startup, `init_db.py` automatically creates all 17 relational tables and seeds demonstration institutions, applications, documents, OCR results, compliance rules, and alerts.

### Step 2 — Start the React TypeScript Frontend
```powershell
cd frontend
npm install
npm run dev
```
- Open `http://localhost:3000` in your browser.

---

## 4. Demonstration Credentials

You can autofill any of these roles with one click on the Login screen:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Administrator** | `admin@aicte.gov.in` | `Admin@123456` |
| **AICTE Verification Officer** | `officer@aicte.gov.in` | `Officer@123456` |
| **Institution Administrator** | `institute@demo.edu.in` | `Institute@123456` |

