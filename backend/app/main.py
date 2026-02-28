from fastapi import FastAPI
from app.routes import router

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Urban AQI Intelligence API",
    version="0.1.0"
)

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
    return {"message": "Urban AQI Backend Running"}