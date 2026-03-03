import numpy as np
from sklearn.linear_model import LinearRegression
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_db,
    get_current_user,
)
from app.models import User, Alert, NodeReading, ZoneReading, Incident

router = APIRouter()


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
def get_live_nodes(request: Request, current_user: User = Depends(get_current_user)):
    simulator = request.app.state.simulator
    return {"nodes": simulator.nodes}


@router.get("/zones/live")
def get_zones_live(request: Request, current_user: User = Depends(get_current_user)):
    simulator = request.app.state.simulator
    summary = simulator.get_zone_summary()
    return {"zones": summary}


@router.get("/zones/live-stats")
def get_zones_live_stats(request: Request, current_user: User = Depends(get_current_user)):
    simulator = request.app.state.simulator
    summary = simulator.get_zone_summary()
    
    total_zones = len(summary)
    severe_zone_count = sum(1 for z in summary if z["aqi"] >= 400)
    avg_aqi = sum(z["aqi"] for z in summary) / total_zones if total_zones > 0 else 0

    return {
        "total_zones": total_zones,
        "severe_zone_count": severe_zone_count,
        "average_aqi": round(avg_aqi, 1)
    }


# =====================================================
# ZONE HISTORY (Protected)
# =====================================================

@router.get("/zone/{zone_id}/history")
def get_zone_history(
    zone_id: int,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    simulator = request.app.state.simulator
    raw_history = simulator.get_zone_history(zone_id)

    # Flatten avg_pollutants for API consumers
    history = []
    for entry in raw_history:
        avg = entry.get("avg_pollutants", {})
        history.append({
            "timestamp": entry.get("timestamp"),  # already ISO string
            "aqi": entry.get("aqi"),
            "pm25": avg.get("pm25"),
            "pm10": avg.get("pm10"),
            "no2": avg.get("no2"),
            "co": avg.get("co"),
            "o3": avg.get("o3"),
        })

    return {"zone_id": zone_id, "history": history}


# =====================================================
# ZONE PREDICTION (Protected)
# =====================================================

@router.get("/zone/{zone_id}/predict")
def predict_zone(
    zone_id: int,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    simulator = request.app.state.simulator
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
    request: Request,
    current_user: User = Depends(get_current_user)
):
    simulator = request.app.state.simulator
    success = simulator.set_city(city_name)

    if not success:
        raise HTTPException(status_code=400, detail="Invalid city name")

    return {"message": f"City changed to {city_name}"}


@router.get("/city/current")
def get_current_city(request: Request, current_user: User = Depends(get_current_user)):
    simulator = request.app.state.simulator
    return {
        "city_center_lat": simulator.city_center_lat,
        "city_center_lon": simulator.city_center_lon
    }


@router.get("/city/list")
def list_cities(request: Request, current_user: User = Depends(get_current_user)):
    from app.config import CITIES
    return {"cities": list(CITIES.keys())}


# =====================================================
# SIMULATION CONTROL (Unprotected)
# =====================================================

@router.post("/simulation/interval/{seconds}")
def set_simulation_interval(
    seconds: int,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    simulator = request.app.state.simulator
    if seconds < 1:
        seconds = 1
    if seconds > 120:
        seconds = 120

    simulator.simulation_interval = seconds
    return {
        "message": "Simulation interval updated",
        "interval_seconds": simulator.simulation_interval
    }


# =====================================================
# ALERT ENGINE ROUTES (Protected)
# =====================================================

@router.get("/alerts")
def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return latest 50 alerts ordered by created_at desc."""
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(50).all()
    return {"alerts": alerts}


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark an alert as acknowledged."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.acknowledged = True
    db.commit()
    return {"message": f"Alert {alert_id} acknowledged"}


@router.get("/alerts/unacknowledged/count")
def get_unacknowledged_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return count of unacknowledged alerts and severe zone count."""
    total_alerts = db.query(Alert).filter(Alert.acknowledged == False).count()
    
    severe_zone_count = db.query(Alert.zone_id)\
        .filter(Alert.level == "Severe", Alert.acknowledged == False)\
        .distinct().count()

    return {
        "total_alerts": total_alerts,
        "severe_zone_count": severe_zone_count
    }


# =====================================================
# SYSTEM STATUS (Protected)
# =====================================================

@router.get("/system/status")
def get_system_status(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    simulator = request.app.state.simulator
    """Return backend system status metrics."""
    # Get last write times from DB
    last_node = db.query(NodeReading.timestamp).order_by(NodeReading.timestamp.desc()).first()
    last_zone = db.query(ZoneReading.timestamp).order_by(ZoneReading.timestamp.desc()).first()
    
    return {
        "simulation_running": True,
        "last_node_write_time": last_node[0] if last_node else None,
        "last_zone_write_time": last_zone[0] if last_zone else None,
        "total_zones": simulator.rows * simulator.cols,
        "total_nodes": simulator.num_nodes,
        "refresh_interval": simulator.simulation_interval
    }


# =====================================================
# INCIDENT ROUTES (Protected)
# =====================================================

@router.get("/incidents/active")
def get_active_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return all active incidents with recommendations."""
    incidents = db.query(Incident).filter(Incident.status == "Active").all()
    
    # Format recommendations for frontend
    result = []
    for inc in incidents:
        result.append({
            "id": inc.id,
            "zone_id": inc.zone_id,
            "severity_level": inc.severity_level,
            "start_time": inc.start_time,
            "recommendations": inc.recommendations.split("|") if inc.recommendations else [],
            "predictive_warning": inc.predictive_warning
        })
    return {"incidents": result}


@router.get("/incidents/resolved")
def get_resolved_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return latest 20 resolved incidents."""
    incidents = db.query(Incident).filter(Incident.status == "Resolved")\
        .order_by(Incident.start_time.desc()).limit(20).all()
    return {"incidents": incidents}