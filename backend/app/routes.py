import numpy as np
from sklearn.linear_model import LinearRegression

from fastapi import APIRouter
from app.simulator import AQISimulator

router = APIRouter()

simulator = AQISimulator()


@router.get("/health")
def health_check():
    return {"status": "OK"}


@router.get("/nodes/live")
def get_live_nodes():
    data = simulator.simulate()
    return {"nodes": data}

@router.get("/node/{node_id}/history")
def get_node_history(node_id: int):
    history = simulator.get_history(node_id)
    return {"node_id": node_id, "history": history}

@router.get("/node/{node_id}/predict")
def predict_next(node_id: int):

    # Get last 10 readings
    values = simulator.get_last_n_pm25(node_id, n=10)

    if len(values) < 5:
        return {"error": "Not enough data yet"}

    # Prepare training data
    X = np.array(range(len(values))).reshape(-1, 1)
    y = np.array(values)

    model = LinearRegression()
    model.fit(X, y)

    # Predict next time step
    next_step = np.array([[len(values)]])
    prediction = model.predict(next_step)

    return {
        "node_id": node_id,
        "last_values": values,
        "predicted_next_pm25": float(prediction[0])
    }