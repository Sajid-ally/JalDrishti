<div align="center">
🌊 JalDrishti
AI-Powered Water & Civic Intelligence Platform
<p>
JalDrishti connects citizens, AI/ML-assisted analysis, location intelligence, social-media signals, and government workflows to help identify, verify, assign, track, and resolve water-related civic problems.
</p>
<p>
  <a href="https://jaldrishti-blond.vercel.app/"><strong>🌐 JalDrishti Live Demo</strong></a>
  &nbsp;•&nbsp;
  <a href="https://coastalsocial-frontend.onrender.com"><strong>🌊 Coastal Social Demo</strong></a>
  &nbsp;•&nbsp;
  <a href="https://github.com/Sajid-ally/JalDrishti"><strong>💻 GitHub Repository</strong></a>
</p>
</div>
---
📌 About the Project
JalDrishti is a civic intelligence platform built around the idea that a water-related problem should not stop at a photograph or complaint.
The platform brings together two major sources of ground-level information:
Citizen reports submitted with images and location.
Social-media signals, demonstrated in the prototype through Coastal Social, a dummy social-media platform.
JalDrishti then connects these inputs with AI/ML-assisted analysis, location intelligence, administrative verification, department assignment, status tracking, notifications, and emergency-response workflows.
The goal is to turn fragmented observations into structured, actionable information for authorities.
🎯 Problem Statement
Smart India Hackathon 2026 — SIH1291  
Theme: Disaster Management  
Category: Software
The project addresses challenges such as:
Scattered water-related information across different sources
Noisy and unverified social-media content
Difficulty categorizing water-related incidents
Inaccurate or incomplete location information
Limited visibility into report status and government action
Difficulty coordinating departments and response teams
---
🚀 Key Features
👥 Citizen Experience
📸 Water Hazard Reporting — Submit images, descriptions, and location details.
📍 Location Intelligence — GPS/manual location support with administrative location information.
🆔 Unique Report IDs — Every report receives a traceable public ID.
🔍 Report Tracking — Follow the report lifecycle and timeline.
🚨 SOS / Rescue Requests — Submit emergency assistance requests.
🔔 Notifications — Stay informed about report and response activity.
🗺️ Map Visibility — View water-related incidents geographically.
🏛️ Government & Administration
📊 Government Dashboard — Monitor report volumes and operational status.
📋 Report Review — Review and verify incoming incidents.
✅ Verification Workflow — Approve, reject, and maintain verification information.
⚡ Priority Management — Prioritize incidents based on operational needs.
🏢 Department Assignment — Route incidents to relevant departments.
🔄 Status Management — Move reports through review, verification, action, and resolution stages.
🚑 Emergency Operations — Manage and assign rescue/relief requests.
📈 Tracking & Monitoring — Follow departmental progress and report history.
🌊 Social Intelligence
Coastal Social provides a controlled social-media prototype for demonstrating external-source ingestion.
Potentially relevant posts can enter a verification workflow instead of becoming official reports automatically.
The architecture is designed so approved social-media signals can be converted into structured JalDrishti reports.
---
🧠 AI / ML Layer
JalDrishti separates different intelligent tasks:
Gemini AI
Used for assisting with report information such as:
Meaningful title generation
Description generation from uploaded images
Custom ML Pipeline
Designed for image-based water-problem analysis and categorization, including categories such as:
Urban Flooding
Waterlogging
Drainage Problems
Dirty Ponds / Lakes
Other water-related problems
> **Note:** The current repository/prototype may contain test or seeded ML results. Real production ML inference should be considered separately from demo/test data.
---
🗺️ Location Intelligence
JalDrishti combines:
GPS / Manual Location  
↓  
Latitude & Longitude  
↓  
Reverse Geocoding  
↓  
State • District • City • Locality  
↓  
Maps & Administrative Routing
Technologies include Leaflet, OpenStreetMap, and Nominatim.
---
🔄 End-to-End Workflow
```text
Citizen Report / Social Signal
            │
            ▼
      Image + Context
            │
            ▼
      AI / ML Analysis
            │
            ▼
   Location & Geocoding
            │
            ▼
      FastAPI Backend
            │
            ▼
         MongoDB
            │
            ▼
   Government Verification
            │
            ▼
 Priority + Department Assignment
            │
            ▼
      Action / Tracking
            │
            ▼
         Resolution
```
Report Lifecycle
```text
Submitted
   ↓
Under Review
   ↓
Verified
   ↓
Action In Progress
   ↓
Resolved
```
---
🏗️ System Architecture
```text
                    ┌─────────────────────────┐
                    │       JalDrishti        │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
              ▼                                     ▼
     ┌─────────────────┐                  ┌─────────────────┐
     │ Citizen Portal  │                  │ Government      │
     │                 │                  │ Portal          │
     │ • Report        │                  │ • Dashboard     │
     │ • Tracking      │                  │ • Review        │
     │ • SOS           │                  │ • Verification  │
     │ • Notifications │                  │ • Assignment    │
     └────────┬────────┘                  │ • Emergency     │
              │                           └────────┬────────┘
              └────────────────┬───────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │   FastAPI REST API  │
                    └─────────┬───────────┘
                              │
                 ┌────────────┴─────────────┐
                 ▼                          ▼
        ┌─────────────────┐        ┌─────────────────┐
        │    MongoDB      │        │   AI / ML       │
        │  Report Data    │        │ Gemini + ML     │
        └─────────────────┘        └─────────────────┘
```
---
🛠️ Technology Stack
Layer	Technologies
Frontend	React, TypeScript, Vite, Tailwind CSS
Backend	Python, FastAPI, Uvicorn, REST APIs
Database	MongoDB
AI	Google Gemini API
ML	Custom image-classification pipeline
Maps	Leaflet, OpenStreetMap, Nominatim
Notifications / UI	React Hot Toast, Lucide React
Deployment	Vercel / Render (project components)
---
🔌 Core API Areas
The backend exposes REST APIs for the main workflows, including:
Area	Purpose
`/reports`	Report creation, retrieval, tracking, verification, priority, assignment, and status
`/relief`	Emergency and rescue-request management
`/social-reports`	Social-media report review and conversion workflow
`/notifications`	Application notification retrieval and read state
`/auth`	User/session-related operations where configured
Interactive backend documentation is available through FastAPI Swagger when the backend is running:
```text
http://127.0.0.1:8000/docs
```
---
💾 Data Model
The core `reports` data includes fields such as:
```text
publicReportId
username
title
description
imageUrl
category
location
aiAnalysis
mlAnalysis
status
priority
timeline
verification
createdAt
updatedAt
```
Emergency workflows use a separate relief-request data structure for:
```text
title
description
location
peopleAffected
assistanceRequired
urgency
username
status
assignedTeam
governmentNote
createdAt
updatedAt
```
---
🌐 Live Demos
JalDrishti
Production demo / deployed frontend
👉 https://jaldrishti-blond.vercel.app/
Coastal Social
Dummy social-media platform used to demonstrate the social-intelligence workflow
👉 https://coastalsocial-frontend.onrender.com
GitHub
👉 https://github.com/Sajid-ally/JalDrishti
---
💻 Local Development
Backend
```bash
cd Backend
python -m venv .venv
```
Activate the environment and install dependencies:
```bash
pip install -r requirements.txt
```
Start FastAPI:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Swagger:
```text
http://127.0.0.1:8000/docs
```
Frontend
```bash
cd frontend
npm install
npm run dev
```
For a production build:
```bash
npm run build
```
> Configure the required environment variables locally before running the application. Never commit secrets or API keys to the repository.
---
📸 Why JalDrishti?
JalDrishti is designed around an important distinction:
> **A report is not the end of the process — it is the beginning of an information-to-action workflow.**
The platform aims to connect:
Detection → Verification → Prioritization → Assignment → Response → Tracking → Resolution
This makes the system relevant not only to citizens, but also to municipal departments, disaster-management teams, and other administrative stakeholders.
---
💡 Innovation
JalDrishti's innovation is primarily at the system and workflow level, rather than claiming that individual technologies are new.
Dual-Source Intelligence
Combines citizen reports with social-media signals.
AI + ML Assistance
Uses AI to reduce reporting effort and ML to assist with image-based water-problem analysis.
Location-Aware Reporting
Connects reports with GPS coordinates and administrative geography.
Human-in-the-Loop Verification
Potential social-media signals are not automatically treated as confirmed incidents; administrative verification remains part of the workflow.
End-to-End Civic Action
The system connects reporting with government verification, assignment, monitoring, and resolution.
---
📈 Scalability & Future Scope
The architecture can be extended toward:
Official social-media API integrations subject to platform permissions and policies
Asynchronous / queue-based processing for high-volume social-media ingestion
Production-grade ML inference and monitoring
IoT-based water-level and water-quality data
Satellite and geospatial data sources
Predictive flood and hotspot analysis
Multilingual citizen interfaces
Automated escalation and SLA monitoring
Cloud-scale deployment across municipalities, districts, and states
For high-volume social-media streams, the intended approach is to use lightweight filtering before expensive ML analysis so that the system does not unnecessarily run image inference on every incoming post.
---
💼 Business Model
JalDrishti follows a Business-to-Government (B2G) model.
Potential revenue streams include:
Government SaaS / annual platform licensing
Department-specific dashboards and workflow customization
Municipal, district, and state-level deployment
Integration with existing government systems
Premium analytics and monitoring
AI/ML customization and usage-based services
Annual maintenance and technical support
Dedicated/private deployments
The objective is to provide governments with a configurable operational platform rather than only a citizen reporting form.
---
🌍 Expected Impact
JalDrishti can support:
Faster identification of water-related hazards
Better coordination between citizens and authorities
Improved prioritization and resource allocation
Greater transparency through report tracking
Better visibility into recurring geographic problem areas
More structured disaster-response information
Improved monitoring of flooding, drainage, waterlogging, and water-body issues
---
⚠️ Prototype Scope & Transparency
The project is a working prototype and should be understood accordingly.
The current Coastal Social source is a dummy social-media environment used to demonstrate the workflow.
Real social-media integrations would require official APIs, permissions, platform-specific constraints, and responsible data handling.
AI/ML capabilities should be evaluated based on the actual deployed model/service rather than seeded or test records.
Production deployment would require further security hardening, authentication controls, monitoring, scaling, and operational infrastructure.
---
👥 Project
JalDrishti — AI-Powered Water & Civic Intelligence Platform
Smart India Hackathon 2026  
Problem Statement: SIH1291  
Theme: Disaster Management  
Team: ZENITH
---
<div align="center">
🌊 From a water-related problem to actionable civic intelligence.
Built for smarter reporting, better coordination, and more responsive water-hazard management.
</div>
