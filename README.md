# ClimateBuild AI — Enterprise Construction Climate Risk & Intelligence Platform

An industrial-grade full-stack web application designed for construction risk prediction, activity-level vulnerability modeling, geotechnical IoT telemetry, worker heat-stress safety (WBGT), weather-aware smart scheduling, and capital loss estimation.

---

## 🌟 Key Features

1. **Dashboard Overview (`/dashboard`)**
   - High-level site vulnerability index (0-100 scale).
   - Real-time weather condition summary (precipitation, wind, temperature, humidity).
   - Active safety warnings and IoT sensor health monitoring.
   - 7-day synoptic weather risk and milestone delay trend forecast.
   - Interactive micro-climate simulator with live model recalculation.

2. **Geospatial GIS Risk Map (`/gis-map`)**
   - Leaflet interactive map with high-reliability OpenStreetMap, Topo, and Humanitarian layers.
   - Multi-site geographic pins (Pune Metro, Mumbai Coastal Road, Nashik Highway, Aurangabad Industrial Hub).
   - Dynamic buffer zones adjusting in radius and severity color based on live weather hazards.

3. **Real-Time AI Site Vision & CCTV Monitoring (`/vision`)**
   - 4-channel construction CCTV simulator (Tower Crane, Excavation Pit, Concrete Batching, Drainage Canal).
   - Dynamic real-time weather overlay (monsoonal downpours, wind sway, thermal shimmer).
   - Real-time AI hazard bounding boxes (PPE compliance, crane hoist lockout, waterlogging).
   - Thermal Infrared (IR) inspection mode.

4. **Climate Intelligence Station (`/climate`)**
   - Multi-source meteorological telemetry integrated with Open-Meteo Synoptic API.
   - 24-hour hourly construction timeline with precipitation intervals.
   - Maharashtra regional construction climate grid.

5. **Multi-Site Project Portfolio (`/sites`)**
   - Multi-project management interface tracking CapEx, crews, and geographic coordinates.
   - Modal to register and onboard new infrastructure sites.

6. **Activity Risk & Vulnerability Matrix (`/activities`)**
   - Trade-level vulnerability modeling for 8 critical construction tasks:
     - Deep Excavation & Trenching
     - Foundation Piling & Raft
     - Structural Concrete Pouring
     - Tower Crane & Rigging Deck
     - Roofing & Cladding
     - Road Paving & Bitumen Laying
     - High-Altitude Steel Erection
     - Heavy Hauling & Transit Mixers
   - Standard Operating Procedure (SOP) enforcement.

7. **Geotechnical IoT Sensor Network (`/sensors`)**
   - Industrial telemetry from vibrating wire piezometers, ultrasonic water sensors, anemometers, and maturity temp probes.
   - Interactive stress-test simulation injecting high soil pore pressure events.

8. **Worker Safety Index & Heat Stress (`/safety`)**
   - Wet Bulb Globe Temperature (WBGT) calculation following OSHA and NDMA protocols.
   - Mandatory work/rest cycles and hydration directives.
   - Multilingual audio and text broadcasts in English, Hindi (हिंदी), and Marathi (मराठी).

9. **Weather-Aware Smart Scheduling (`/scheduling`)**
   - AI What-If comparison engine (Scenario A Unmitigated vs. Scenario B Weather-Optimized).
   - Resequencing outdoor tasks to dry windows to eliminate machinery demurrage.

10. **Delay & Cost Impact Estimator (`/estimator`)**
    - Interactive financial sliders for daily overhead, idle machinery penalty, and demurrage rates.
    - Automatic cumulative loss calculation and AI Mitigation ROI.

11. **Permanent Audit & Alert History (`/reports`)**
    - SQLite database persistence (`climatebuild.db`) storing all safety alerts and operator acknowledgements.
    - PDF report generator and CSV audit log export.

12. **Site Assistant Chatbox (floating 💬 button, bottom-right)**
    - Reads the live dashboard (risk, sensors, alerts, WBGT) and answers in English / हिंदी / मराठी.
    - Can act: `switch to Mumbai`, `simulate rain 120 wind 60`, `what if heat wave`, `reset weather`, `open map`, `sync live weather`, `export pdf`.
    - Quick-reply chips, voice input (Chrome/Edge), chat history kept per browser tab. Works offline - no API key needed (`chat.js`).

13. **User Profiles & Role-Based Access Control (`/accounts`)**
    - Persona switcher:
      - 👷 Rahul Sharma (Site Operations Engineer)
      - 🦺 Pooja Deshmukh (Safety & Compliance Officer)
      - 📊 Vikram Patil (Project Director / Investor)
      - 🏢 Shiva Contractor (Lead Master Contractor)

---

## 🚀 Quick Start Guide

### 1. Requirements
- Python 3.9+ and a modern browser
- Internet connection (map tiles, fonts, Leaflet and jsPDF load from CDNs; Leaflet auto-retries unpkg -> cdnjs -> jsDelivr and map tiles fall back OSM -> CARTO -> Esri)

### 2. Run
- **Windows:** double-click `start.bat` (installs requirements, starts the server, opens the browser)
- **Manual:**
```bash
pip install -r requirements.txt
python app.py
```
Open **http://127.0.0.1:5000**. Do not open `index.html` by double-click unless the server is also running; the page needs the backend for saved alerts.

### 3. Check that the backend works
Open http://127.0.0.1:5000/api/health, it should show `"status": "ok"` and `"model_loaded": true`.

---

## 🔌 API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Status and model info |
| POST | `/api/predict` | Risk score + level (ML + rule engine) |
| POST | `/api/activities` | Risk for all 8 activities |
| GET / POST | `/api/alerts` | List / create alerts |
| POST | `/api/alerts/<id>/ack` | Acknowledge alert |
| POST | `/api/alerts/<id>/resolve` | Resolve alert |
| POST | `/api/alerts/clear` | Delete resolved alerts |
| GET / POST | `/api/sites`, GET `/api/sites/<id>` | Sites |
| GET | `/api/sensors`, `/api/schedule` | Sensors, schedule scenarios |
| POST | `/api/impact/estimate` | Delay cost estimate |
| POST | `/api/auth/login`, GET `/api/auth/users` | Demo personas (no real auth) |

## 🗄️ Notes
- Database: SQLite `climatebuild.db`, created automatically on first run (delete it to reset).
- The server only serves `index.html`, `style.css`, `script.js`, `i18n.js`, `chat.js`; `app.py`, `model.pkl` and the database are not downloadable.
- Sensors, sites and schedule screens still use built-in demo data in `script.js`; their API endpoints exist for future wiring.
- Login/roles are a demo persona switcher, not real security.
