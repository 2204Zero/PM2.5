# backend/app/simulator.py

import random
import datetime
import requests
import time

from app.config import DATA_MODE, REAL_FETCH_INTERVAL_SECONDS, CITY_NAME, CITIES
from app.aqi_calculator import AQICalculator
from app.database import SessionLocal
from app.models import NodeReading, ZoneReading


class AQISimulator:

    def __init__(self, nodes_per_zone=40, rows=6, cols=6):
        self.rows = rows
        self.cols = cols
        self.nodes_per_zone = nodes_per_zone
        self.num_nodes = rows * cols * nodes_per_zone
        self.last_db_write = 0

        # Load initial city
        city_config = CITIES.get(CITY_NAME.lower(), CITIES["delhi"])

        self.city_center_lat = city_config["lat"]
        self.city_center_lon = city_config["lon"]

        self.lat_range = 0.06
        self.lon_range = 0.06

        self.base_lat = self.city_center_lat - (self.lat_range / 2)
        self.base_lon = self.city_center_lon - (self.lon_range / 2)

        self.aqi_engine = AQICalculator(standard="india")

        self.nodes = self._generate_nodes()

        self.node_history = {node["id"]: [] for node in self.nodes}
        self.zone_history = {z: [] for z in range(self.rows * self.cols)}

        self.real_zone_cache = {}
        self.last_real_fetch = 0

    # --------------------------------------------------
    # Generate structured nodes
    # --------------------------------------------------
    def _generate_nodes(self):
        nodes = []
        zone_height = self.lat_range / self.rows
        zone_width = self.lon_range / self.cols

        node_id = 0

        for row in range(self.rows):
            for col in range(self.cols):

                zone_id = row * self.cols + col

                lat_min = self.base_lat + row * zone_height
                lat_max = lat_min + zone_height

                lon_min = self.base_lon + col * zone_width
                lon_max = lon_min + zone_width

                for _ in range(self.nodes_per_zone):
                    lat = random.uniform(lat_min, lat_max)
                    lon = random.uniform(lon_min, lon_max)

                    nodes.append({
                        "id": node_id,
                        "latitude": lat,
                        "longitude": lon,
                        "zone": zone_id,
                        "pm25": 0,
                        "pm10": 0,
                        "no2": 0,
                        "co": 0,
                        "o3": 0,
                        "temperature": 0,
                        "humidity": 0
                    })

                    node_id += 1

        return nodes

    # --------------------------------------------------
    # PUBLIC simulate()
    # --------------------------------------------------
    def simulate(self):
        if DATA_MODE == "real":
            return self._simulate_real_mode()
        return self._simulate_fake_mode()

    # --------------------------------------------------
    # FAKE MODE
    # --------------------------------------------------
    def _simulate_fake_mode(self):

        timestamp = datetime.datetime.now().isoformat()

        for node in self.nodes:
            pollutants = self._simulate_pollutants()
            node.update(pollutants)

            db = SessionLocal()

            node_entry = NodeReading(
                node_id=node["id"],
                pm25=node["pm25"],
                pm10=node["pm10"],
                no2=node["no2"],
                co=node["co"],
                o3=node["o3"],
                temperature=node.get("temperature"),
                humidity=node.get("humidity")
            )

            db.add(node_entry)
            db.commit()
            db.close()

            self.node_history[node["id"]].append({
                "timestamp": timestamp,
                **pollutants
            })

            if len(self.node_history[node["id"]]) > 50:
                self.node_history[node["id"]] = self.node_history[node["id"]][-50:]

        self._update_zone_history(timestamp)
        return self.nodes

    # --------------------------------------------------
    # REAL MODE
    # --------------------------------------------------
    def _simulate_real_mode(self):

        current_time = time.time()

        if current_time - self.last_real_fetch > REAL_FETCH_INTERVAL_SECONDS:
            self._fetch_real_zone_data()
            self.last_real_fetch = current_time

        timestamp = datetime.datetime.now().isoformat()

        for node in self.nodes:

            zone_data = self.real_zone_cache.get(node["zone"])

            if not zone_data:
                zone_data = {
                    "pm25": 40,
                    "pm10": 60,
                    "no2": 50,
                    "co": 1.0,
                    "o3": 50
                }

            node.update({
                "pm25": max(5, zone_data["pm25"] + random.uniform(-3, 3)),
                "pm10": max(10, zone_data["pm10"] + random.uniform(-5, 5)),
                "no2": max(5, zone_data["no2"] + random.uniform(-5, 5)),
                "co": max(0.1, zone_data["co"] + random.uniform(-0.2, 0.2)),
                "o3": max(5, zone_data["o3"] + random.uniform(-5, 5)),
                "temperature": random.randint(20, 40),
                "humidity": random.randint(30, 90)
            })

            db = SessionLocal()

            node_entry = NodeReading(
                node_id=node["id"],
                pm25=node["pm25"],
                pm10=node["pm10"],
                no2=node["no2"],
                co=node["co"],
                o3=node["o3"],
                temperature=node.get("temperature"),
                humidity=node.get("humidity")
            )

            db.add(node_entry)
            db.commit()
            db.close()

            self.node_history[node["id"]].append({
                "timestamp": timestamp,
                "pm25": node["pm25"],
                "pm10": node["pm10"],
                "no2": node["no2"],
                "co": node["co"],
                "o3": node["o3"]
            })

            if len(self.node_history[node["id"]]) > 50:
                self.node_history[node["id"]] = self.node_history[node["id"]][-50:]

        self._update_zone_history(timestamp)
        return self.nodes

    # --------------------------------------------------
    # Fetch real data per zone
    # --------------------------------------------------
    def _fetch_real_zone_data(self):

        for zone_id in range(self.rows * self.cols):

            zone_nodes = [n for n in self.nodes if n["zone"] == zone_id]

            if not zone_nodes:
                continue

            avg_lat = sum(n["latitude"] for n in zone_nodes) / len(zone_nodes)
            avg_lon = sum(n["longitude"] for n in zone_nodes) / len(zone_nodes)

            url = (
                f"https://air-quality-api.open-meteo.com/v1/air-quality"
                f"?latitude={avg_lat}&longitude={avg_lon}"
                f"&hourly=pm2_5,pm10,nitrogen_dioxide,ozone"
            )

            try:
                response = requests.get(url, timeout=10)
                data = response.json()

                def safe_last_valid(values, default):
                    for v in reversed(values):
                        if v is not None:
                            return v
                    return default

                pm25 = safe_last_valid(data["hourly"]["pm2_5"], 40)
                pm10 = safe_last_valid(data["hourly"]["pm10"], 60)
                no2 = safe_last_valid(data["hourly"]["nitrogen_dioxide"], 50)
                o3 = safe_last_valid(data["hourly"]["ozone"], 50)

                self.real_zone_cache[zone_id] = {
                    "pm25": pm25,
                    "pm10": pm10,
                    "no2": no2,
                    "co": 1.0,
                    "o3": o3
                }

            except Exception:
                self.real_zone_cache[zone_id] = {
                    "pm25": 40,
                    "pm10": 60,
                    "no2": 50,
                    "co": 1.0,
                    "o3": 50
                }

    # --------------------------------------------------
    # Pollutant simulation
    # --------------------------------------------------
    def _simulate_pollutants(self):
        current_hour = datetime.datetime.now().hour
        base_pm = 40

        if 7 <= current_hour <= 10 or 17 <= current_hour <= 21:
            spike = random.randint(20, 80)
        else:
            spike = random.randint(-10, 20)

        return {
            "pm25": max(5, base_pm + spike),
            "pm10": max(10, base_pm + spike + random.randint(0, 30)),
            "no2": max(5, random.randint(20, 150)),
            "co": round(random.uniform(0.5, 5.0), 2),
            "o3": random.randint(10, 200),
            "temperature": random.randint(20, 40),
            "humidity": random.randint(30, 90)
        }

    # --------------------------------------------------
    # Zone aggregation
    # --------------------------------------------------
    def _update_zone_history(self, timestamp):

        zone_pollutants = {z: [] for z in range(self.rows * self.cols)}

        for node in self.nodes:
            zone_pollutants[node["zone"]].append(node)

        #Track whether we should persisr to DB
        current_time = time.time()
        should_write_to_db = current_time - self.last_db_write

        db = None
        if should_write_to_db:
            db = SessionLocal()

        for zone_id, nodes in zone_pollutants.items():
            
            if not nodes:
                continue

            avg_data = {
                "pm25": sum(n["pm25"] for n in nodes) / len(nodes),
                "pm10": sum(n["pm10"] for n in nodes) / len(nodes),
                "no2": sum(n["no2"] for n in nodes) / len(nodes),
                "co": sum(n["co"] for n in nodes) / len(nodes),
                "o3": sum(n["o3"] for n in nodes) / len(nodes)
            }

            aqi_result = self.aqi_engine.calculate_aqi(avg_data)

            if not aqi_result:
                continue

            trend = self._calculate_trend(zone_id, aqi_result["aqi"])

            zone_record = {
                "timestamp": timestamp,
                "avg_pollutants": avg_data,
                "aqi": aqi_result["aqi"],
                "dominant_pollutant": aqi_result["dominant_pollutant"],
                "trend": trend
            }

            #Keep in memory history (fast, always)
            self.zone_history[zone_id].append(zone_record)

            if len(self.zone_history[zone_id])>50:
                self.zone_history[zone_id] = self.zone_history[zone_id]

            #Persist only if 5-minute interval passed
            if should_write_to_db:
                zone_entry = ZoneReading(
                    zone_id=zone_id,
                    aqi=zone_record["aqi"],
                    dominant_pollutant=zone_record["dominant_pollutant"],
                    pm25=avg_data["pm25"],
                    pm10=avg_data["pm10"],
                    no2=avg_data["no2"],
                    co=avg_data["co"],
                    o3=avg_data["o3"],
                    trend=zone_record["trend"]
                    )
                db.add(zone_entry)

            if should_write_to_db and db:
                db.commit()
                db.close()
                self.last_db_write = current_time
            

    # --------------------------------------------------
    # Trend detection
    # --------------------------------------------------
    def _calculate_trend(self, zone_id, current_aqi):

        history = self.zone_history.get(zone_id, [])

        if not history:
            return "stable"

        last_aqi = history[-1]["aqi"]

        if current_aqi > last_aqi + 5:
            return "rising"
        elif current_aqi < last_aqi - 5:
            return "falling"
        else:
            return "stable"

    # --------------------------------------------------
    # Zone summary
    # --------------------------------------------------
    def get_zone_summary(self):

        summary = []

        for zone_id, history in self.zone_history.items():

            if not history:
                continue

            latest = history[-1]

            zone_nodes = [n for n in self.nodes if n["zone"] == zone_id]

            avg_lat = sum(n["latitude"] for n in zone_nodes) / len(zone_nodes)
            avg_lon = sum(n["longitude"] for n in zone_nodes) / len(zone_nodes)

            summary.append({
                "zone_id": zone_id,
                "aqi": latest["aqi"],
                "dominant_pollutant": latest["dominant_pollutant"],
                "trend": latest["trend"],
                "latitude": avg_lat,
                "longitude": avg_lon,
                **latest["avg_pollutants"]
            })

        return summary

    def get_zone_history(self, zone_id):
        return self.zone_history.get(zone_id, [])

    # --------------------------------------------------
    # Change city dynamically
    # --------------------------------------------------
    def set_city(self, city_name):

        city_config = CITIES.get(city_name.lower())

        if not city_config:
            return False

        self.city_center_lat = city_config["lat"]
        self.city_center_lon = city_config["lon"]

        self.base_lat = self.city_center_lat - (self.lat_range / 2)
        self.base_lon = self.city_center_lon - (self.lon_range / 2)

        self.nodes = self._generate_nodes()

        self.node_history = {node["id"]: [] for node in self.nodes}
        self.zone_history = {z: [] for z in range(self.rows * self.cols)}

        self.real_zone_cache = {}
        self.last_real_fetch = 0

        return True