# backend/app/config.py

DATA_MODE = "real"  # "simulator" or "real"
REAL_FETCH_INTERVAL_SECONDS = 600

CITY_NAME = "mumbai"  # change to mumbai, bangalore, chennai, kolkata

CITIES = {
    "delhi": {"lat": 28.6139, "lon": 77.2090},
    "mumbai": {"lat": 19.0760, "lon": 72.8777},
    "bangalore": {"lat": 12.9716, "lon": 77.5946},
    "chennai": {"lat": 13.0827, "lon": 80.2707},
    "kolkata": {"lat": 22.5726, "lon": 88.3639}
}