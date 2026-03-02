from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base


# -------------------------
# Node Reading Table
# -------------------------
class NodeReading(Base):
    __tablename__ = "node_readings"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, index=True)

    pm25 = Column(Float)
    pm10 = Column(Float)
    no2 = Column(Float)
    co = Column(Float)
    o3 = Column(Float)

    temperature = Column(Float)
    humidity = Column(Float)

    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)


# -------------------------
# Zone Reading Table
# -------------------------
class ZoneReading(Base):
    __tablename__ = "zone_readings"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, index=True)

    aqi = Column(Float)
    dominant_pollutant = Column(String)

    pm25 = Column(Float)
    pm10 = Column(Float)
    no2 = Column(Float)
    co = Column(Float)
    o3 = Column(Float)

    trend = Column(String)

    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)


# -------------------------
# City Change Log Table
# -------------------------
class CityLog(Base):
    __tablename__ = "city_logs"

    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


# -------------------------
# User Table (NEW)
# -------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())