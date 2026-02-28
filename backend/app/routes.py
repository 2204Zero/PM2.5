import numpy as np
from sklearn.linear_model import LinearRegression

from fastapi import APIRouter
from app.simulator import AQISimulator

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
    return {"nodes": data}


# -------------------------
# Node History
# -------------------------
@router.get("/node/{node_id}/history")
def get_node_history(node_id: int):
    history = simulator.get_history(node_id)
    return {"node_id": node_id, "history": history}


# -------------------------
# Node Prediction (Next 5 Steps)
# -------------------------
@router.get("/node/{node_id}/predict")
def predict_next(node_id: int):

    values = simulator.get_last_n_pm25(node_id, n=10)

    if len(values) < 5:
        return {"error": "Not enough data yet"}

    X = np.array(range(len(values))).reshape(-1, 1)
    y = np.array(values)

    model = LinearRegression()
    model.fit(X, y)

    future_steps = 5
    predictions = []

    for step in range(len(values), len(values) + future_steps):
        pred = model.predict(np.array([[step]]))
        predictions.append(float(pred[0]))

    return {
        "node_id": node_id,
        "last_values": values,
        "predicted_next_5": predictions
    }


# -------------------------
# Live Zone Summary
# -------------------------
@router.get("/zones/live")
def get_zones_live():

    # Run simulation to update zone history
    simulator.simulate()

    zone_summary = []

    for zone_id in range(4):
        history = simulator.get_zone_history(zone_id)

        if history:
            latest = history[-1]
            zone_summary.append({
                "zone_id": zone_id,
                "avg_pm25": latest["avg_pm25"],
                "category": latest["category"]
            })

    return {"zones": zone_summary}


# -------------------------
# Zone History
# -------------------------
@router.get("/zone/{zone_id}/history")
def get_zone_history(zone_id: int):
    history = simulator.get_zone_history(zone_id)
    return {"zone_id": zone_id, "history": history}

@router.get("/zone/{zone_id}/predict")
def predict_zone(zone_id: int):

    history = simulator.get_zone_history(zone_id)

    if len(history) < 5:
        return {"error": "Not enough zone data yet"}

    values = [entry["avg_pm25"] for entry in history[-10:]]

    X = np.array(range(len(values))).reshape(-1, 1)
    y = np.array(values)

    model = LinearRegression()
    model.fit(X, y)

    future_steps = 5
    predictions = []

    for step in range(len(values), len(values) + future_steps):
        pred = model.predict(np.array([[step]]))
        predictions.append(float(pred[0]))

    # Determine highest predicted value
    max_future = max(predictions)

    # Risk classification
    if max_future <= 50:
        risk_level = "Low"
    elif max_future <= 100:
        risk_level = "Moderate"
    elif max_future <= 150:
        risk_level = "High"
    else:
        risk_level = "Severe"

    return {
        "zone_id": zone_id,
        "last_zone_avg": values,
        "predicted_next_5": predictions,
        "risk_level": risk_level
    }