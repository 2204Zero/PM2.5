PM 2.5 Admin Pannel


A Smart City Air Quality Monitoring and Simulation Platform that visualizes pollution data,
simulates IoT sensor networks, and demonstrates how air-quality monitoring infrastructure
works in an urban environment.

The platform combines:
- Real-time AQI dashboard
- Zone-based pollution monitoring
- Sensor network simulation
- Predictive analytics
- Alert and incident system
- Interactive city visualization

It acts as a digital twin prototype for how a real-world smart city air monitoring system could operate.

------------------------------------------------------------

SYSTEM OVERVIEW

Air Particles → Sensor Nodes → Zone Hubs → Central Server

Components:

1. Sensor Nodes
Simulate physical air-quality sensors.
Collect PM2.5, PM10, NO₂, CO, O₃.
Generate pollution data.

2. Zone Hubs
Aggregate sensor data.
Represent city zones.

3. Central Server
Receives zone data.
Processes AQI calculations.
Generates alerts and incidents.

4. Dashboard
Visualizes pollution levels across zones.
Shows trends and predictions.

------------------------------------------------------------

FEATURES

AQI Dashboard

- Live AQI monitoring across multiple zones
- Interactive heatmap visualization
- Zone-based pollution metrics
- Dominant pollutant detection
- AQI trend indicators
- Zone ranking by pollution severity

------------------------------------------------------------

SMART CITY SIMULATION ENGINE

A custom-built simulation engine models realistic urban pollution behavior.

Features include:
- Zone pollution profiles (Low, Medium, High)
- Gradual pollution drift
- Traffic-based pollution spikes
- Independent zone evolution
- Sensor variability simulation
- Node-level data generation

------------------------------------------------------------

IoT NETWORK DIGITAL TWIN

A Canvas-based network simulation demonstrates how pollution data flows through the infrastructure.

Simulation Layers:

1. Air particles entering sensors
2. Sensors processing air samples
3. Data packets sent to zone hubs
4. Zone hubs aggregating sensor data
5. Aggregated data sent to central server

------------------------------------------------------------

NETWORK VISUALIZATION

The system uses a Leaflet map + Canvas overlay architecture:

Leaflet Map (Geographic Context)
↓
Canvas Simulation Layer
↓
UI Controls

------------------------------------------------------------

SYMBOL-BASED NETWORK COMPONENTS

Air Flow → Particle system
Sensor Nodes → IoT sensor with signal arcs
Zone Hubs → Network hub with ports
Data Packets → Glowing data blocks
Server → Rack-style server

------------------------------------------------------------

AQI HEATMAP COLOR SYSTEM

AQI Range | Category | Color

0 – 50 → Good → Green
51 – 100 → Satisfactory → Light Green
101 – 200 → Moderate → Amber
201 – 300 → Poor → Red
301 – 400 → Very Poor → Dark Red
401+ → Severe → Maroon

------------------------------------------------------------

ALERTS AND INCIDENT ENGINE

Alerts trigger when AQI crosses thresholds:
Poor
Very Poor
Severe

Duplicate alerts within 10 minutes are suppressed.

------------------------------------------------------------

INCIDENT MANAGEMENT SYSTEM

If a zone remains highly polluted for a sustained period,
an Incident is automatically generated.

Example mitigation actions:
- Deploy anti-smog guns
- Restrict heavy vehicle traffic
- Suspend construction activity
- Issue public health advisory

------------------------------------------------------------

PREDICTIVE AQI FORECASTING

The platform includes a basic machine learning prediction model using Linear Regression.

It predicts:
- Future AQI values
- Risk level for each zone

------------------------------------------------------------

BACKEND ARCHITECTURE

Framework: FastAPI

Responsibilities:
- AQI simulation
- Sensor data generation
- Alert detection
- Incident management
- Prediction engine
- Database persistence
- Authentication

------------------------------------------------------------

API ENDPOINTS

/auth/register
/auth/login

/nodes/live
/zones/live
/zones/live-stats

/zone/{zone_id}/history
/zone/{zone_id}/predict

/city/set/{city_name}
/city/current
/city/list

/simulation/interval/{seconds}

alerts
incidents
system/status

------------------------------------------------------------

FRONTEND ARCHITECTURE

Framework: React (Vite)

Libraries:
- React Leaflet
- Axios
- Canvas API

Main Pages:
Login Page
Dashboard
Zone Details
Network Simulation

------------------------------------------------------------

DEPLOYMENT

Backend → Render
Frontend → Vercel

Environment variable:

VITE_API_BASE_URL=https://your-backend-url.onrender.com

------------------------------------------------------------

RUNNING LOCALLY

Backend:

cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

Backend runs on:
http://127.0.0.1:8000

Frontend:

cd frontend
npm install
npm run dev

Frontend runs on:
http://localhost:5173

------------------------------------------------------------

PROJECT STRUCTURE

urban-aqi-intelligence

backend/
    app/
        auth.py
        simulator.py
        routes.py
        models.py
        database.py
        config.py
        aqi_calculator.py
        main.py

frontend/
    src/
        components/
        pages/
        simulation/
        axiosConfig.js

    .env

README.md

------------------------------------------------------------

FUTURE IMPROVEMENTS

- Real sensor integration
- WebSocket real-time updates
- Advanced pollution prediction models
- GPU-based visualization
- Hardware IoT integration
- Mobile UI improvements

------------------------------------------------------------

AUTHOR

Lakshya Goyal
AI & Data Science Student

Interests:
- Smart city systems
- Artificial intelligence
- Environmental technology
- Large-scale simulation platforms

