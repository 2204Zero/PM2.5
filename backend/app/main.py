from fastapi import FastAPI
from app.routes import router

app = FastAPI(
    title="Urban AQI Intelligence API",
    version="0.1.0"
)

app.include_router(router)

@app.get("/")
def root():
    return {"message": "Urban AQI Backend Running"}