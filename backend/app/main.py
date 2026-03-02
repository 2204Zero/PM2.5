import asyncio
from fastapi import FastAPI
from app.routes import router
from app.database import engine
from app.models import Base
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Urban AQI Intelligence API",
    version="0.1.0"
)
Base.metadata.create_all(bind=engine)

@app.on_event("startup")
async def start_background_simulation():
    asyncio.create_task(simulation_loop())


async def simulation_loop():
    from app.routes import simulator
    print("Simulation loop started")
    while True:
        simulator.simulate()
        await asyncio.sleep(simulator.simulation_interval)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {"message": "PM2.5 Backend Running"}