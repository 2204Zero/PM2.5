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