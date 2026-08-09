# 🌊 CoastalEye

### AI-Powered Coastal Disaster Intelligence & Response Platform

> **From citizen reports to verified incidents — CoastalEye transforms fragmented disaster information into actionable intelligence.**

CoastalEye is an AI-powered coastal disaster management platform designed to help citizens, authorities, and emergency-response teams **detect, validate, visualize, and respond to coastal hazards**.

The platform combines **AI-powered image analysis, citizen-generated reports, geospatial intelligence, incident confidence scoring, validation mechanisms, heatmap visualization, and emergency-response workflows** into a unified disaster intelligence system.

---

## 🚨 The Problem

Coastal regions are highly vulnerable to disasters such as:

- 🌊 Flooding
- 🌧️ Waterlogging
- 🌪️ Cyclones
- 🏚️ Infrastructure damage
- 🚧 Blocked roads
- 🌊 Coastal hazards
- 🆘 Emergency situations

During a disaster, information is often:

- fragmented across different platforms,
- delayed,
- duplicated,
- difficult to verify,
- geographically scattered, and
- mixed with unreliable reports.

A single social-media post or citizen report should **not automatically be treated as a confirmed disaster event**.

CoastalEye addresses this problem by creating a pipeline:


Citizen / External Source
          ↓
     Report Submission
          ↓
     AI Image Analysis
          ↓
      Validation
          ↓
   Reliability Scoring
          ↓
   Nearby Report Analysis
          ↓
    Incident Detection
          ↓
  Incident Confidence
          ↓
     Heatmap / Alerts
          ↓
   Disaster Intelligence

🎯 **Our Solution**

CoastalEye acts as a disaster intelligence layer between raw information and actionable response.

Instead of simply displaying reports, the system attempts to answer:

"Is this report credible?"

"Are multiple reports describing the same incident?"

"How confident are we that this incident is genuine?"

"Where are the affected areas concentrated?"

"What information should authorities prioritize?"

##✨ **Key Features**
📸 1. **AI-Powered Disaster Reporting**

Citizens can submit disaster reports containing:

Title
Description
Geographic coordinates
Image evidence

Uploaded images are processed using Google Gemini-based image analysis.

The AI can extract useful information such as:

image title,
visual description,
observed environmental conditions.

Example:

Uploaded Image
      ↓
Gemini Vision Analysis
      ↓
"Submerged buildings and fields"
      ↓
Structured disaster information


🤖 **2. AI-Assisted Image Analysis**

CoastalEye uses AI to analyze submitted visual evidence.

Example AI output:

{
  "title": "Submerged buildings and fields",
  "description": "Aerial view showing extensive brown water surrounding buildings, trees, and agricultural land."
}

This allows raw visual evidence to be converted into structured information that can be processed by the backend.

📍 **3. Geospatial Report Analysis**

Every report can contain geographic coordinates:

{
  "latitude": 19.8135,
  "longitude": 85.8312
}

CoastalEye uses geographical distance calculations to identify reports located within a specified radius.

For example:

Location:
19.8135, 85.8312

Search Radius:
5 km

             Report A ●
                    \
                     \
              Incident ●
                     /
                    /
             Report B ●

This allows geographically related reports to be analyzed together.

🔎 **4. Nearby Report Detection**

The system can search for reports around a specific geographic location.

Example:

Latitude:  19.8135
Longitude: 85.8312
Radius:    5 km

The backend identifies reports within that radius and calculates their distance from the requested location.


🛡️ **5. Report Validation & Reliability Scoring**

Not every submitted report should be treated as genuine.

CoastalEye maintains validation information for reports.

Example:

{
  "validation": {
    "status": "Genuine",
    "reliabilityScore": 80
  }
}

Reports can have different states such as:

Genuine
Pending
Insufficient Evidence

A reliability score is associated with validated evidence.

This allows the system to distinguish between:

High-confidence evidence
        ↓
Medium-confidence evidence
        ↓
Low-confidence / pending evidence

🧠 **6. Incident Intelligence**

Multiple reports from the same geographical region can represent a single real-world incident.

Instead of treating every report independently, CoastalEye can aggregate related reports into an incident.

Example:

Report 1 ─────┐
              │
Report 2 ─────┼──→ FLOOD INCIDENT
              │
Report 3 ─────┘

The incident stores information such as:

category,
location,
number of reports,
average reliability score,
confidence distribution,
overall incident status.


📊 **7. Incident Confidence Analysis**

CoastalEye calculates incident-level confidence using available validated reports.

Example:

{
  "reportCount": 2,
  "averageScore": 75,
  "highConfidenceReports": 2,
  "mediumConfidenceReports": 0,
  "lowConfidenceReports": 0,
  "incidentStatus": "Genuine"
}

This allows authorities to understand not only how many reports exist, but also how trustworthy the overall incident appears to be.

🗺️ **8. Report Heatmap**

CoastalEye provides a report heatmap API that identifies reports around a geographic area.

Example:

             ●
          ●     ●
        ●    🔴    ●
          ●     ●
             ●

Each report contains information such as:

location,
distance,
category,
validation status,
reliability score.

This data can be consumed by the frontend map layer.

🔥 **9. Incident Heatmap**

The platform also supports incident-level heatmap analysis.

Instead of simply showing individual reports, the incident heatmap represents aggregated disaster intelligence.

This enables a map to distinguish between:

Individual Reports
       ↓
Related Reports
       ↓
Incident Cluster
       ↓
Incident Confidence

The final visual representation can then be handled by the frontend/ML visualization layer.

🏛️ **10. Government Alert Intelligence**

The backend provides government-alert functionality that can use:

nearby reports,
validation results,
incident confidence,
geographical clustering,
heatmap data.

The objective is to help authorities identify potentially genuine disaster situations faster.

📱 **11. External Social Media Intelligence**

CoastalEye is designed to support information coming from an independent Social Media application.

Rather than permanently coupling the social-media interface to CoastalEye, the architecture allows a separate application to contribute information through APIs.

┌───────────────────────────┐
│   Social Media Platform   │
│                           │
│ Posts / Evidence / Data   │
└─────────────┬─────────────┘
              │
              │ REST API
              ▼
┌───────────────────────────┐
│        CoastalEye         │
│                           │
│ Validation + Intelligence │
│ Incident Detection        │
│ Heatmap                   │
└───────────────────────────┘

This architecture allows the social-media component to be:

independently developed,
independently deployed,
accessed from another device,
connected to CoastalEye through APIs.
🧩 System Architecture
                                     👤 CITIZEN
              Reports / Images
                     │
                     ▼
          🌊 COASTALEYE BACKEND
                 FastAPI
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
     🤖 Gemini    🗄️ MongoDB    🧠 ML
     AI Vision    Database      Services
        │            │            │
        └────────────┼────────────┘
                     ▼
             🛡️ VALIDATION
                     │
          Reliability + Status
                     │
                     ▼
             🚨 INCIDENT ENGINE
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    Clustering    Confidence   Aggregation
        │            │            │
        └────────────┼────────────┘
                     ▼
          📊 DISASTER INTELLIGENCE
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    🗺️ Heatmaps   🏛️ Alerts   🚑 Response
    
##🛠️ **Technology Stack**
Backend
Python
FastAPI
Uvicorn
MongoDB
PyMongo / MongoDB integration
REST APIs
AI / ML
Python
Google Gemini
AI-assisted image analysis
Disaster classification / intelligence pipeline
Geospatial analysis
Frontend
React
TypeScript
CSS
GIS / map visualization
Development & Testing
Git
GitHub
VS Code
Swagger / OpenAPI
MongoDB Shell
Postman

##🌍 **Why CoastalEye?**

Traditional disaster reporting systems often focus on collecting information.

CoastalEye focuses on turning information into intelligence.

**Traditional Approach**
Report → Database → Display

**CoastalEye Approach**
Report
  ↓
AI Analysis
  ↓
Validation
  ↓
Reliability
  ↓
Geospatial Correlation
  ↓
Incident Detection
  ↓
Confidence Analysis
  ↓
Actionable Intelligence

##🎯 **Target Users**

**👥 Citizens**
Report hazards
Upload visual evidence
Share location
Request assistance

🏛️ **Government & Authorities**
Monitor disaster incidents
Identify high-confidence events
Analyze affected regions
Prioritize response

**🚑 Emergency Response Teams**
Identify affected locations
Analyze incident severity/confidence
Coordinate rescue and relief

**🌊 Coastal Monitoring Teams**
Monitor emerging hazards
Analyze geographical clusters
Track disaster patterns
