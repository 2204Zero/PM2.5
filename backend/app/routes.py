import numpy as np
from sklearn.linear_model import LinearRegression
from fastapi import APIRouter
from app.simulator import AQISimulator
from fastapi import HTTPException


router = APIRouter()

simulator = AQISimulator()


# -------------------------
# Health Check
# -------------------------
@router.get("/health")
def health_check():
    return {"status": "OK"}


# -------------------------
# Live Node Data
# -------------------------
@router.get("/nodes/live")
def get_live_nodes():
    data = simulator.simulate()
    print("Total nodes:", len(data))
    return {"nodes": data}


# -------------------------
# Live Zone Summary (Updated)
# -------------------------
@router.get("/zones/live")
def get_zones_live():
    simulator.simulate()
    summary = simulator.get_zone_summary()
    return {"zones": summary}


# -------------------------
# Zone History
# -------------------------
@router.get("/zone/{zone_id}/history")
def get_zone_history(zone_id: int):
    history = simulator.get_zone_history(zone_id)
    return {"zone_id": zone_id, "history": history}


# -------------------------
# Zone AQI Prediction
# -------------------------
@router.get("/zone/{zone_id}/predict")
def predict_zone(zone_id: int):

    history = simulator.get_zone_history(zone_id)

    if len(history) < 5:
        return {"error": "Not enough zone data yet"}

    # Use AQI values instead of PM25 only
    values = [entry["aqi"] for entry in history[-10:]]

    X = np.array(range(len(values))).reshape(-1, 1)
    y = np.array(values)

    model = LinearRegression()
    model.fit(X, y)

    future_steps = 5
    predictions = []

    for step in range(len(values), len(values) + future_steps):
        pred = model.predict(np.array([[step]]))
        predictions.append(float(pred[0]))

    max_future = max(predictions)

    if max_future <= 50:
        risk_level = "Good"
    elif max_future <= 100:
        risk_level = "Satisfactory"
    elif max_future <= 200:
        risk_level = "Moderate"
    elif max_future <= 300:
        risk_level = "Poor"
    elif max_future <= 400:
        risk_level = "Very Poor"
    else:
        risk_level = "Severe"

    return {
        "zone_id": zone_id,
        "last_aqi_values": values,
        "predicted_next_5": predictions,
        "risk_level": risk_level
    }


@router.post("/city/set/{city_name}")
def set_city(city_name: str):

    success = simulator.set_city(city_name)

    if not success:
        raise HTTPException(status_code=400, detail="Invalid city name")

    return {"message": f"City changed to {city_name}"}

@router.get("/city/current")
def get_current_city():
    return {
        "city_center_lat": simulator.city_center_lat,
        "city_center_lon": simulator.city_center_lon
    }

@router.get("/city/list")
def list_cities():
    from app.config import CITIES
    return {"cities": list(CITIES.keys())}