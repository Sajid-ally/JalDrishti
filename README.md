<div align="center">

# 🌊 JalDrishti (CoastalEye)
### **Real-Time AI-Driven Water Hazard Management, Municipal Response Dispatch & Citizen SOS Relief Platform**

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-Async_Motor-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Multimodal_AI-8E75C2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Build Status](https://img.shields.io/badge/Build-Passing%20(100%25)-brightgreen?style=for-the-badge)]()
[![Documentation](https://img.shields.io/badge/PDF_Docs-Included-red?style=for-the-badge&logo=adobe-acrobat-reader&logoColor=white)](./JalDrishti_CoastalEye_Complete_System_Documentation.pdf)

<p align="center">
  A state-of-the-art emergency disaster management system bridging citizens and municipal government authorities during urban flooding, waterlogging, drainage overflow, and coastal water crises.
</p>

</div>

---

## 📑 Table of Contents
1. [Key Features & Capabilities](#-key-features--capabilities)
2. [Dual-Portal Architecture](#-dual-portal-architecture)
3. [System Architecture Diagram](#-system-architecture-diagram)
4. [Technology Stack](#-technology-stack)
5. [Prerequisites](#-prerequisites)
6. [Step-by-Step Installation & Local Setup](#-step-by-step-installation--local-setup)
   - [A. Backend Setup (FastAPI & Virtual Environment)](#a-backend-setup-fastapi--virtual-environment)
   - [B. Frontend Setup (React 19 & Vite)](#b-frontend-setup-react-19--vite)
   - [C. ML Service Setup (Optional)](#c-ml-service-setup-optional)
7. [Environment Variables Reference](#-environment-variables-reference)
8. [Lifecycle Workflow & 24-Hour Auto-Purge Policy](#-lifecycle-workflow--24-hour-auto-purge-policy)
9. [API Endpoints Summary](#-api-endpoints-summary)
10. [Automated Verification & Test Suites](#-automated-verification--test-suites)
11. [Project Directory Structure](#-project-directory-structure)
12. [Demo Accounts & Roles](#-demo-accounts--roles)

---

## 🌟 Key Features & Capabilities

### 👥 For Citizens:
- **📸 Smart Incident Reporting**: Upload photos, location (GPS / manual search), severity, and problem category (Urban Flooding, Drainage Overflow, Waterlogging, Water Quality).
- **🤖 Multimodal AI Verification**: Automated severity scoring, water depth estimation, and instant classification powered by Google Gemini.
- **🚨 SOS Emergency Rescue & Relief**: Direct SOS dispatch requests specifying number of trapped people, urgency level, and medical/food requirements.
- **🔍 Live Lifecycle Status Tracker**: Real-time 5-stage progress stepper (`Submitted` $\rightarrow$ `Under Review` $\rightarrow$ `Assigned` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved`), with assigned department badges, field squad details, and official municipal action logs.
- **⚠️ Official Rejection Transparency**: If a report is rejected by authorities, citizens receive a prominent explanation banner with the exact reason recorded by the reviewing officer.
- **⏳ 24-Hour Auto-Purge Notice**: Concluded incidents feature a live countdown timer showing the 24-hour retention window before permanent deletion from MongoDB.
- **🗺️ Interactive Live Hazard Map**: Geospatial cluster map displaying real-time incidents, severity color codes, and hotspot hazard zones.

### 🏛️ For Government & Disaster Authorities:
- **📊 Dynamic Command Dashboard**: Real-time city-level metrics (Pending Review, Active Verified Hazards, Dewatering In-Progress, Resolved, Rejected, and High Severity Hotspots).
- **🏢 Multi-Jurisdiction City Filter**: Dynamically filter problems by city or state across India without hardcoded defaults.
- **📋 Report Review & Department Dispatch**: Assign verified incidents directly to specialized squads (*Drainage Department*, *Jal Nigam*, *Public Works (PWD)*, *Sanitation*, *NDRF/SDRF*).
- **❌ Mandatory Reason Rejection Workflow**: Reject invalid/duplicate reports with quick tags and custom officer notes; unlists from active queue immediately.
- **🚜 SOS Rescue Team Management**: Deploy rescue squads (*NDRF*, *SDRF*, *Fire & Rescue*) with allocated gear (Boats, Medical Kits, Food), mark missions as resolved, or permanently remove completed records.
- **👤 Dynamic Profile Synchronization**: Live name, designation, and department management that updates the Topbar, Sidebar, JWT token claims, and assignment audit trails in real-time.

---

## 🏛️ Dual-Portal Architecture

```
                                  ┌────────────────────────────────┐
                                  │       JalDrishti Platform      │
                                  └───────────────┬────────────────┘
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 │                                                                 │
                 ▼                                                                 ▼
      ┌─────────────────────┐                                           ┌─────────────────────┐
      │   Citizen Portal    │                                           │  Government Portal  │
      ├─────────────────────┤                                           ├─────────────────────┤
      │ • Incident Form     │                                           │ • Control Dashboard │
      │ • Live Map View     │                                           │ • Review Desk       │
      │ • Status Tracker    │                                           │ • Dept Dispatch     │
      │ • SOS Relief Form   │                                           │ • SOS Rescue Teams  │
      │ • Dynamic Profile   │                                           │ • Rejection Workflow│
      └──────────┬──────────┘                                           └──────────┬──────────┘
                 │                                                                 │
                 └────────────────────────┬────────────────────────────────────────┘
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │  FastAPI REST API   │
                               ├─────────────────────┤
                               │ • JWT Auth Service  │
                               │ • Report Engine     │
                               │ • Relief Dispatch   │
                               │ • Auto-Purge Worker │
                               └──────────┬──────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        ▼                                   ▼
             ┌─────────────────────┐             ┌─────────────────────┐
             │  MongoDB Atlas DB   │             │   Google Gemini AI  │
             │ • 24h TTL Indexes   │             │ • Vision Analysis   │
             │ • Spatial Clusters  │             │ • Severity Scoring  │
             └─────────────────────┘             └─────────────────────┘
```

---

## 💻 Technology Stack

| Layer | Technologies | Primary Role |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS | High-performance reactive Single Page Application (SPA) |
| **UI & Icons** | Lucide React, React-Leaflet, React Hot Toast | Responsive navigation, interactive mapping, toast alerts |
| **Backend** | Python 3.12, FastAPI, Uvicorn, AsyncIO | High-throughput asynchronous REST API server |
| **Database** | MongoDB Atlas, Motor (Async ODM), PyMongo | Cloud document database with TTL indexes & geo-spatial queries |
| **Authentication**| JWT (HMAC-SHA256), Passlib (Bcrypt), OAuth2 | Secure bearer token auth with dynamic claims & role guards |
| **AI / ML** | Google Gemini 1.5 Multimodal, Scikit-Learn | Automated image verification, hazard classification, spatial clustering |

---

## ⚙️ Prerequisites

Before getting started, make sure you have the following installed on your machine:

- **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **Python**: `v3.10`, `v3.11`, or `v3.12` ([Download Python](https://www.python.org/))
- **Git**: For source version control ([Download Git](https://git-scm.com/))
- **MongoDB Atlas URI** or Local MongoDB instance running on `localhost:27017`

---

## 🚀 Step-by-Step Installation & Local Setup

### A. Backend Setup (FastAPI & Virtual Environment)

1. **Navigate to the Backend directory**:
   ```bash
   cd Backend
   ```

2. **Create a Python Virtual Environment**:
   - **Windows (PowerShell / Command Prompt)**:
     ```powershell
     python -m venv .venv
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     ```

3. **Activate the Virtual Environment**:
   - **Windows (PowerShell)**:
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
     *(If you receive an Execution Policy error in PowerShell, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first)*
   - **Windows (Command Prompt / CMD)**:
     ```cmd
     .\.venv\Scripts\activate.bat
     ```
   - **macOS / Linux (Bash/Zsh)**:
     ```bash
     source .venv/bin/activate
     ```

4. **Install all required backend dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. **Configure Environment Variables**:
   Create a `.env` file inside the `Backend/` directory (or edit the existing one):
   ```env
   PORT=8000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
   DATABASE_NAME=coastal_eye
   JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
   JWT_ALGORITHM=HS256
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

6. **Start the FastAPI Backend Server**:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   * The API server will be live at: **`http://localhost:8000`**
   * Interactive Swagger Documentation: **`http://localhost:8000/docs`**
   * Alternative ReDoc: **`http://localhost:8000/redoc`**

---

### B. Frontend Setup (React 19 & Vite)

1. **Open a new terminal window** and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. **Install all frontend npm packages**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Verify or create `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. **Start the Vite Development Server**:
   ```bash
   npm run dev
   ```
   * Open your browser and visit: **`http://localhost:5173`**

5. **Build for Production**:
   ```bash
   npm run build
   ```
   *(Produces optimized production artifacts inside `frontend/dist/`)*

---

### C. ML Service Setup (Optional)

If running the dedicated standalone computer vision service:
```bash
cd ml-service
python -m venv .venv
# Activate virtualenv as shown above
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
```

---

## 🔒 Environment Variables Reference

### Backend (`Backend/.env`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | FastAPI server listening port | `8000` |
| `MONGO_URI` | MongoDB Atlas or Local connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DATABASE_NAME` | Target MongoDB database name | `coastal_eye` |
| `JWT_SECRET` | Secret key used for signing JWT auth tokens | `super_secret_key` |
| `JWT_ALGORITHM` | JWT cryptographic algorithm | `HS256` |
| `GEMINI_API_KEY` | Google Gemini Multimodal AI API Key | `AIzaSy...` |

### Frontend (`frontend/.env`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL of the running FastAPI Backend | `http://localhost:8000` |

---

## ⏳ Lifecycle Workflow & 24-Hour Auto-Purge Policy

```
[Citizen Submits Report] ──► [Stage 1: Submitted]
                                      │
                                      ▼
                        [Stage 2: Desk Under Review]
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
        (Officer Rejects)                        (Officer Assigns Squad)
                 │                                         │
                 ▼                                         ▼
        [Stage: REJECTED]                         [Stage 3: Assigned]
                 │                                         │
                 │                                         ▼
                 │                               [Stage 4: In Progress]
                 │                                         │
                 │                                         ▼
                 │                                [Stage 5: RESOLVED]
                 │                                         │
                 └────────────────────┬────────────────────┘
                                      │
                                      ▼
                   [24-Hour Retention Timer Starts]
                     • concludedAt = timestamp
                     • expiresAt = timestamp + 24 hours
                                      │
                                      ▼
                  [Auto-Purged from MongoDB after 24h]
```

1. **Incident Assignment**: When an incident is assigned, the department (e.g. *Drainage Department*) and field squad are saved to the report and displayed live on the Citizen Track page.
2. **Rejection with Reason**: When rejected, a mandatory reason is captured and displayed in a red banner to the citizen, while unlisting the report from the active municipal queue.
3. **24-Hour Auto-Purge Engine**: When an incident reaches **`Resolved`** or **`Rejected`**, a 24-hour expiration timestamp is stamped on the database record. After 24 hours, MongoDB and the backend auto-cleaner permanently delete the document.

---

## 📡 API Endpoints Summary

### 🔐 Authentication (`/auth`)
- `POST /auth/login` — Login with email/password; returns JWT bearer token.
- `GET /auth/me` — Retrieve active user session and role.
- `PATCH /auth/profile` — Update user name, phone, department, or designation and receive refreshed JWT token.

### 📝 Water Hazard Reports (`/reports`)
- `POST /reports/` — Submit a new hazard report with image & coordinates.
- `GET /reports/` — Query reports filtered by city, state, category, status, or priority.
- `GET /reports/{id}` — Fetch tracking details and audit timeline for a report ID.
- `PATCH /reports/{id}/assignment` — Assign incident to a municipal department and field squad.
- `PATCH /reports/{id}/status` — Update lifecycle status (`in_progress`, `resolved`, `rejected` with reason).

### 🚨 SOS Rescue & Relief (`/relief`)
- `POST /relief/` — Log emergency SOS rescue request.
- `GET /relief/` — Fetch all active rescue requests.
- `PATCH /relief/{id}/assign` — Assign NDRF/SDRF rescue team and resources.
- `PATCH /relief/{id}/status` — Mark mission as `In Progress`, `Resolved`, or `Completed`.
- `DELETE /relief/{id}` — Permanently delete/remove rescue request from database.

---

## 🧪 Automated Verification & Test Suites

The codebase includes automated end-to-end Python test scripts to verify all system features:

```bash
# Run complete system integration audit (Reports, Rescue, Stats, Tracking)
python scratch/full_system_test.py

# Test profile renaming and dynamic Topbar sync
python scratch/test_profile_rename.py

# Test rescue operations resolution and permanent deletion
python scratch/test_rescue_resolve_delete.py

# Test report lifecycle transitions and 24-hour MongoDB auto-purge
python scratch/test_24h_timer_and_stages.py

# Verify frontend TypeScript build
cd frontend && npm run build
```

---

## 📂 Project Directory Structure

```
CoastalEye/
├── Backend/                        # FastAPI Python Backend
│   ├── app/
│   │   ├── auth/                   # Authentication & profile routes/services
│   │   ├── reports/                # Report lifecycle, assignment & auto-purge
│   │   ├── relief/                 # SOS rescue & NDRF relief operations
│   │   ├── models/                 # Clustering & ML ranking models
│   │   ├── database.py             # MongoDB Atlas async client
│   │   └── main.py                 # FastAPI application entry point
│   ├── requirements.txt            # Python dependencies
│   └── .env                        # Backend environment variables
│
├── frontend/                       # React 19 + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── components/             # Reusable UI components & drawers
│   │   ├── context/                # AuthContext & global state
│   │   ├── pages/
│   │   │   ├── Citizen/            # Citizen Dashboard, Report, Track, SOS, Map
│   │   │   └── Government/         # Gov Dashboard, Review Desk, Rescue, Map
│   │   ├── services/               # API clients, adapters & HTTP services
│   │   └── routes/                 # AppRoutes & protected role routing
│   ├── package.json                # Frontend npm dependencies
│   ├── vite.config.ts              # Vite configuration
│   └── .env                        # Frontend environment variables
│
├── ml-service/                     # Standalone ML hazard detection service
├── JalDrishti_Documentation.pdf   # Complete downloadable PDF documentation
└── README.md                       # Project documentation
```

---

## 🔑 Demo Accounts & Roles

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Government Officer** | `admin@coastaleye.gov` | `admin123` | Control Dashboard, Review Desk, Department Dispatch, Rescue Missions |
| **Citizen User** | `citizen@coastaleye.org` | `citizen123` | Report Hazard, SOS Rescue Request, Track Report, Live Citizen Map |

---

## 📄 License
This project is licensed under the **MIT License**.

---

<div align="center">
  <sub>Built with ❤️ for resilient, data-driven disaster management and public safety.</sub>
</div>
