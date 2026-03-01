<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Inter&weight=600&size=28&pause=1000&color=1F7AE0&center=true&vCenter=true&width=700&lines=Urban+AQI+Intelligence;Real-Time+Air+Quality+Monitoring+Platform;Zone-Based+Intelligence+%7C+ML+Forecasting+%7C+Secure+Admin" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/Frontend-React-20232A?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Database-SQLite-07405E?style=for-the-badge&logo=sqlite" />
  <img src="https://img.shields.io/badge/Authentication-JWT-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/ML-ScikitLearn-F7931E?style=for-the-badge&logo=scikit-learn" />
</p>

---

## Overview

Urban AQI Intelligence is a full-stack environmental monitoring system designed to simulate distributed air quality nodes, aggregate zone-level intelligence, and provide predictive forecasting under a secure authentication framework.

The platform models a scalable smart-city air monitoring architecture.

---

## Architecture

<details>
<summary><b>Backend (FastAPI)</b></summary>

- AQI Simulation Engine  
- Zone Aggregation Engine  
- JWT Authentication  
- SQLite Logging  
- ML Forecasting  
- Protected APIs  

</details>

<details>
<summary><b>Frontend (React + Leaflet)</b></summary>

- Real-time Heatmap  
- Zone Dashboard  
- City Control Panel  
- Session-Based Route Protection  

</details>

---

## Authentication Flow

1. User logs in  
2. Backend generates JWT token  
3. Token stored in sessionStorage  
4. Axios attaches Authorization header  
5. Protected routes validate identity  

---

## Core Capabilities

### Real-Time Simulation
- Node-level pollutant modeling
- Zone-based AQI aggregation
- Dominant pollutant detection
- Trend classification

### Real Data Mode
- Open-Meteo API integration
- Zone centroid-based retrieval
- Smart caching layer

### Intelligence Layer
- Linear regression forecasting
- 5-step AQI prediction
- Risk categorization

### Database Logging
- Node readings
- Zone readings
- City logs
- User accounts

---

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| Backend | FastAPI, SQLAlchemy, SQLite |
| Frontend | React, React Router, Axios |
| ML | scikit-learn |
| Auth | JWT, Passlib (bcrypt) |
| Maps | Leaflet |

---

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload