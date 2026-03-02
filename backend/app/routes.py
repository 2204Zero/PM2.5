import numpy as np
from sklearn.linear_model import LinearRegression
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.simulator import AQISimulator
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_db,
    get_current_user,
)
from app.models import User

router = APIRouter()
simulator = AQISimulator()

# =====================================================
# AUTH ROUTES
# =====================================================

@router.post("/auth/register")
def register(
    username: str,
    password: str,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = User(
        username=username,
        hashed_password=hash_password(password),
        is_admin=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created successfully"}


@router.post("/auth/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": user.username})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# =====================================================
# HEALTH
# =====================================================

@router.get("/health")
def health_check():
    return {"status": "OK"}


# =====================================================
# LIVE DATA (Protected)
# =====================================================

@router.get("/nodes/live")
def get_live_nodes(current_user: User = Depends(get_current_user)):
    return {"nodes": simulator.nodes}


@router.get("/zones/live")
def get_zones_live(current_user: User = Depends(get_current_user)):
    summary = simulator.get_zone_summary()
    return {"zones": summary}


# =====================================================
# ZONE HISTORY (Protected)
# =====================================================

@router.get("/zone/{zone_id}/history")
def get_zone_history(
    zone_id: int,
    current_user: User = Depends(get_current_user)
):
    history = simulator.get_zone_history(zone_id)
    return {"zone_id": zone_id, "history": history}


# =====================================================
# ZONE PREDICTION (Protected)
# =====================================================

@router.get("/zone/{zone_id}/predict")
def predict_zone(
    zone_id: int,
    current_user: User = Depends(get_current_user)
):
    history = simulator.get_zone_history(zone_id)

    if len(history) < 5:
        return {"error": "Not enough zone data yet"}

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


# =====================================================
# CITY CONTROL (Protected)
# =====================================================

@router.post("/city/set/{city_name}")
def set_city(
    city_name: str,
    current_user: User = Depends(get_current_user)
):
    success = simulator.set_city(city_name)

    if not success:
        raise HTTPException(status_code=400, detail="Invalid city name")

    return {"message": f"City changed to {city_name}"}


@router.get("/city/current")
def get_current_city(current_user: User = Depends(get_current_user)):
    return {
        "city_center_lat": simulator.city_center_lat,
        "city_center_lon": simulator.city_center_lon
    }


@router.get("/city/list")
def list_cities(current_user: User = Depends(get_current_user)):
    from app.config import CITIES
    return {"cities": list(CITIES.keys())}


# =====================================================
# SIMULATION CONTROL (Unprotected)
# =====================================================

@router.post("/simulation/interval/{seconds}")
def set_simulation_interval(seconds: int):
    if seconds < 1 or seconds > 120:
        raise HTTPException(
            status_code=400,
            detail="Interval must be between 1 and 120 seconds"
        )

    simulator.simulation_interval = seconds
    return {"simulation_interval": simulator.simulation_interval}