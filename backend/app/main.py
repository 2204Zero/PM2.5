import asyncio
from fastapi import FastAPI
from app.routes import router
from app.database import engine
from app.models import Base
from fastapi.middleware.cors import CORSMiddleware
from app.simulator import AQISimulator
from app.auth import router as auth_router

app = FastAPI(
    title="Urban AQI Intelligence API",
    version="0.1.0"
)
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)

simulator = AQISimulator()
app.state.simulator = simulator

@app.on_event("startup")
async def start_background_simulation():
    asyncio.create_task(simulation_loop())


async def simulation_loop():
    print("Simulation loop started")

    while True:
        try:
            app.state.simulator.simulate()
            print("Tick", app.state.simulator.zone_state[0]["pm25"])
        except Exception as e:
            print(f"Simulation error: {e}")
        await asyncio.sleep(app.state.simulator.simulation_interval)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {"message": "PM2.5 Backend Running"}