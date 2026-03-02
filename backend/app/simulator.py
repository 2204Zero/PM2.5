# backend/app/simulator.py

import random
import datetime
import requests
import time
from sqlalchemy import desc

from app.config import DATA_MODE, REAL_FETCH_INTERVAL_SECONDS, CITY_NAME, CITIES
from app.aqi_calculator import AQICalculator
from app.database import SessionLocal
from app.models import NodeReading, ZoneReading, Alert, Incident


class AQISimulator:

    def __init__(self, nodes_per_zone=40, rows=6, cols=6):
        self.rows = rows
        self.cols = cols
        self.nodes_per_zone = nodes_per_zone
        self.num_nodes = rows * cols * nodes_per_zone
        self.simulation_interval = 15  # default seconds
        self.last_db_write = 0
        self.last_node_db_write = 0
        self.NODE_DB_INTERVAL = 300
        
        # Guard for alerts (10 minutes)
        self.last_alert_time_per_zone = {}
        # Track last AQI level to only trigger on crossing threshold upward
        self.last_aqi_level_per_zone = {}

        # --- Operational Control Room State ---
        self.zone_incident_tracker = {} # zone_id -> {start_time, level, count}
        # -------------------------------------

        # Load initial city
        city_config = CITIES.get(CITY_NAME.lower(), CITIES["delhi"])

        self.city_center_lat = city_config["lat"]
        self.city_center_lon = city_config["lon"]

        self.lat_range = 0.06
        self.lon_range = 0.06

        self.base_lat = self.city_center_lat - (self.lat_range / 2)
        self.base_lon = self.city_center_lon - (self.lon_range / 2)

        self.aqi_engine = AQICalculator(standard="india")

        # Zone-Level State (Primary Architecture)
        self.zone_state = {} 
        
        # Load initial city
        self._initialize_city(CITY_NAME)

        self.node_history = {node["id"]: [] for node in self.nodes}
        self.zone_history = {z: [] for z in range(self.rows * self.cols)}

        self.real_zone_cache = {}
        self.last_real_fetch = 0

    def _initialize_city(self, city_name):
        """Sets up coordinates, nodes, and independent zone states for a specific city."""
        city_config = CITIES.get(city_name.lower(), CITIES["delhi"])

        self.city_center_lat = city_config["lat"]
        self.city_center_lon = city_config["lon"]

        self.base_lat = self.city_center_lat - (self.lat_range / 2)
        self.base_lon = self.city_center_lon - (self.lon_range / 2)

        # Initialize independent zone state
        self.zone_state = self._assign_zone_profiles()
        
        self.nodes = self._generate_nodes()

    # --------------------------------------------------
    # Assign Independent Zone Profiles
    # --------------------------------------------------
    def _assign_zone_profiles(self):
        """
        Assigns independent pollution profiles and initial PM2.5 to each zone.
        Distribution: 30% low, 40% medium, 30% high.
        """
        num_zones = self.rows * self.cols
        states = {}
        
        # Determine counts
        low_count = int(num_zones * 0.3)
        high_count = int(num_zones * 0.3)
        med_count = num_zones - low_count - high_count
        
        # Create pool and shuffle
        pool = (["low"] * low_count) + (["medium"] * med_count) + (["high"] * high_count)
        random.shuffle(pool)
        
        for z in range(num_zones):
            profile = pool[z]
            
            if profile == "low":
                base_min, base_max = 40, 80
            elif profile == "high":
                base_min, base_max = 150, 300
            else: # medium
                base_min, base_max = 80, 160

            states[z] = {
                "profile": profile,
                "bias": random.uniform(-15, 15),
                "pm25": random.uniform(base_min, base_max),
                "pm10": 0, # Initial values
                "no2": 0,
                "co": 0,
                "o3": 0,
                "temperature": random.randint(22, 38),
                "humidity": random.randint(40, 85)
            }
            
        return states

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
        current_time = time.time()
        should_write_to_db = (
            current_time - self.last_node_db_write >= self.NODE_DB_INTERVAL
        )
        db = SessionLocal() if should_write_to_db else None

        # 1. Update Zone State (Primary authority)
        for zone_id in self.zone_state:
            self._update_zone_state(zone_id)

        # 2. Derive Node values from Zone state
        for node in self.nodes:
            zone_id = node["zone"]
            zone_data = self.zone_state[zone_id]

            # Derive node values with variance
            node.update({
                "pm25": max(0, zone_data["pm25"] + random.uniform(-8, 8)),
                "pm10": max(0, zone_data["pm10"] + random.uniform(-10, 10)),
                "no2": max(0, zone_data["no2"] + random.uniform(-5, 5)),
                "co": max(0.1, zone_data["co"] + round(random.uniform(-0.1, 0.1), 2)),
                "o3": max(0, zone_data["o3"] + random.uniform(-10, 10)),
                "temperature": zone_data["temperature"] + random.randint(-1, 1),
                "humidity": zone_data["humidity"] + random.randint(-2, 2)
            })

            if should_write_to_db:
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

        if should_write_to_db and db:
            try:
                db.commit()
                self.last_node_db_write = current_time
                print(f"Node batch write executed at {datetime.datetime.now().isoformat()}")
            except Exception:
                raise
            finally:
                db.close()

        self._update_zone_history(timestamp)
        return self.nodes

    # --------------------------------------------------
    # Zone Evolution Logic (Primary Architecture)
    # --------------------------------------------------
    def _update_zone_state(self, zone_id):
        """
        Updates the primary pollution state for a zone.
        """
        z = self.zone_state[zone_id]
        profile = z["profile"]
        previous = z["pm25"]
        bias = z["bias"]

        # 1. Define Profile Bounds and Base Ranges
        if profile == "low":
            base_min, base_max = 40, 80
            min_bound, max_bound = 30, 100
        elif profile == "high":
            base_min, base_max = 150, 300
            min_bound, max_bound = 130, 400
        else: # medium
            base_min, base_max = 80, 160
            min_bound, max_bound = 70, 220
            
        # 2. Independent evolution with reversion and bias
        profile_base = (base_min + base_max) / 2
        
        drift = random.uniform(-10, 10)
        reversion = (previous - profile_base) * 0.03
        
        # apply individuality bias
        new_pm25 = previous + drift - reversion + (bias * 0.05)
            
        # 3. Time-of-day Factor (Traffic spikes)
        current_hour = datetime.datetime.now().hour
        if 7 <= current_hour <= 10 or 17 <= current_hour <= 21:
            new_pm25 += random.uniform(5, 20)
            
        # 4. Strict Clamping within Profile Bounds
        new_pm25 = max(min_bound, min(new_pm25, max_bound))
        
        # 5. Update derived pollutants
        z.update({
            "pm25": new_pm25,
            "pm10": new_pm25 * 1.5 + random.uniform(0, 30),
            "no2": random.randint(20, 120),
            "co": round(random.uniform(0.5, 3.5), 2),
            "o3": random.randint(10, 150),
            "temperature": random.randint(22, 38),
            "humidity": random.randint(40, 85)
        })

    # --------------------------------------------------
    # REAL MODE
    # --------------------------------------------------
    def _simulate_real_mode(self):

        current_time = time.time()

        if current_time - self.last_real_fetch > REAL_FETCH_INTERVAL_SECONDS:
            self._fetch_real_zone_data()
            self.last_real_fetch = current_time

        timestamp = datetime.datetime.now().isoformat()
        should_write_to_db = (
            current_time - self.last_node_db_write >= self.NODE_DB_INTERVAL
        )
        db = SessionLocal() if should_write_to_db else None

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

            if should_write_to_db:
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

        if should_write_to_db and db:
            try:
                db.commit()
                self.last_node_db_write = current_time
                print(f"Node batch write executed at {datetime.datetime.now().isoformat()}")
            except Exception:
                raise
            finally:
                db.close()

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
    # Zone aggregation
    # --------------------------------------------------
    def _update_zone_history(self, timestamp):

        current_time = time.time()
        
        #5 minute guard
        should_write_to_db = (
            current_time - self.last_db_write >= 300
        )
        db = SessionLocal() if should_write_to_db else None

        for zone_id, zone_data in self.zone_state.items():
            
            # Zone AQI must be calculated directly from zone PM2.5 state (Primary architecture)
            avg_data = {
                "pm25": zone_data["pm25"],
                "pm10": zone_data["pm10"],
                "no2": zone_data["no2"],
                "co": zone_data["co"],
                "o3": zone_data["o3"]
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

            # Keep in memory history (fast, always)
            self.zone_history[zone_id].append(zone_record)

            if len(self.zone_history[zone_id]) > 50:
                self.zone_history[zone_id] = self.zone_history[zone_id][-50:]

            # --- Alert Engine Logic (Hardened) ---
            level = self.aqi_engine.get_aqi_level(aqi_result["aqi"])
            last_level = self.last_aqi_level_per_zone.get(zone_id)
            
            # Severity levels in order to check for upward crossing
            severity_order = ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"]
            
            is_new_severity = False
            if last_level:
                try:
                    if severity_order.index(level) > severity_order.index(last_level):
                        is_new_severity = True
                except ValueError:
                    is_new_severity = True
            else:
                is_new_severity = True

            if level in ["Poor", "Very Poor", "Severe"] and is_new_severity:
                alert_key = (zone_id, level)
                
                # DB Check for duplicate within 10 minutes (System Hardening)
                alert_db = db if db else SessionLocal()
                try:
                    ten_mins_ago = datetime.datetime.now() - datetime.timedelta(minutes=10)
                    existing_alert = alert_db.query(Alert).filter(
                        Alert.zone_id == zone_id,
                        Alert.level == level,
                        Alert.created_at >= ten_mins_ago
                    ).first()

                    if not existing_alert:
                        alert_msg = f"{level} AQI detected in Zone {zone_id}"
                        alert_entry = Alert(
                            zone_id=zone_id,
                            aqi=aqi_result["aqi"],
                            level=level,
                            message=alert_msg
                        )
                        alert_db.add(alert_entry)
                        alert_db.commit()
                        self.last_alert_time_per_zone[alert_key] = current_time
                        print(f"ALERT CREATED: Zone {zone_id} is {level} (AQI: {aqi_result['aqi']})")
                except Exception as e:
                    print(f"Error creating alert: {e}")
                    alert_db.rollback()
                finally:
                    if not db:
                        alert_db.close()
            
            # Always update last level to track crossings
            self.last_aqi_level_per_zone[zone_id] = level
            # -------------------------------------

            # --- Operational Incident Management ---
            # 1. Continuous Threshold Logic: Level must be "Severe" or "Very Poor" for 10 minutes (approx 40 cycles)
            if level in ["Severe", "Very Poor"]:
                if zone_id not in self.zone_incident_tracker:
                    self.zone_incident_tracker[zone_id] = {
                        "level": level,
                        "count": 1,
                        "start_time": datetime.datetime.now()
                    }
                else:
                    self.zone_incident_tracker[zone_id]["count"] += 1
                    
                # Threshold: 2 mins (8 cycles at 15s) for demo/testing
                if self.zone_incident_tracker[zone_id]["count"] == 8:
                    self._trigger_incident(zone_id, level, db)
            else:
                # Reset or Resolve incident
                if zone_id in self.zone_incident_tracker:
                    self._resolve_incident(zone_id, db)
                    del self.zone_incident_tracker[zone_id]
            # -------------------------------------

            # Persist only if 5-minute interval passed
            if should_write_to_db and db:
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
            try:
                db.commit()
                self.last_db_write = current_time
                print(f"Zone batch write executed at {datetime.datetime.now().isoformat()}")
            except Exception:
                raise
            finally:
                db.close()

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
        import math

        for zone_id, history in self.zone_history.items():

            if not history:
                continue

            latest = history[-1]
            current_aqi = latest["aqi"]

            # --- Predictive Early Warning System (Lightweight) ---
            projected_severe = False
            projection_minutes = 0
            
            if len(history) >= 5:
                # Use last 5 values for slope calculation
                recent_data = history[-5:]
                oldest_val = recent_data[0]["aqi"]
                latest_val = recent_data[-1]["aqi"]
                
                # slope = (latest - oldest) / 4 cycles
                slope = (latest_val - oldest_val) / 4
                
                # Project 3 cycles ahead
                projected_value = latest_val + (slope * 3)
                
                if latest_val < 400 and projected_value >= 400 and slope > 0:
                    projected_severe = True
                    # cycles = ceil((400 - latest) / slope)
                    projection_cycles = math.ceil((400 - latest_val) / slope)
                    # simulation_interval_minutes = self.simulation_interval / 60
                    projection_minutes = round(projection_cycles * (self.simulation_interval / 60), 1)
            # ----------------------------------------------------

            zone_nodes = [n for n in self.nodes if n["zone"] == zone_id]

            avg_lat = sum(n["latitude"] for n in zone_nodes) / len(zone_nodes)
            avg_lon = sum(n["longitude"] for n in zone_nodes) / len(zone_nodes)

            summary.append({
                "zone_id": zone_id,
                "aqi": current_aqi,
                "dominant_pollutant": latest["dominant_pollutant"],
                "trend": latest["trend"],
                "latitude": avg_lat,
                "longitude": avg_lon,
                "projected_severe": projected_severe,
                "projection_minutes": projection_minutes,
                **latest["avg_pollutants"]
            })

        return summary

    def get_zone_history(self, zone_id):
        return self.zone_history.get(zone_id, [])

    # --------------------------------------------------
    # Incident Logic & Recommendations
    # --------------------------------------------------
    def _trigger_incident(self, zone_id, level, external_db=None):
        """Creates a persistent incident in the DB."""
        db = external_db if external_db else SessionLocal()
        try:
            # Check if active incident already exists
            existing = db.query(Incident).filter(
                Incident.zone_id == zone_id,
                Incident.status == "Active"
            ).first()
            
            if existing:
                return

            # Generate Recommendations
            recs = self._get_recommendations(level)
            # Predict Trend
            trend = self._predict_trend(zone_id)

            new_incident = Incident(
                zone_id=zone_id,
                severity_level=level,
                status="Active",
                recommendations="|".join(recs),
                predictive_warning=trend
            )
            db.add(new_incident)
            db.commit()
            print(f"INCIDENT ACTIVATED: Zone {zone_id} ({level}) - {trend}")
        except Exception as e:
            print(f"Error triggering incident: {e}")
            db.rollback()
        finally:
            if not external_db:
                db.close()

    def _resolve_incident(self, zone_id, external_db=None):
        """Resolves an active incident."""
        db = external_db if external_db else SessionLocal()
        try:
            incident = db.query(Incident).filter(
                Incident.zone_id == zone_id,
                Incident.status == "Active"
            ).first()
            
            if incident:
                incident.status = "Resolved"
                # Calculate duration
                now = datetime.datetime.now(datetime.timezone.utc)
                diff = now - incident.start_time.replace(tzinfo=datetime.timezone.utc)
                incident.duration_minutes = int(diff.total_seconds() / 60)
                db.commit()
                print(f"INCIDENT RESOLVED: Zone {zone_id}")
        except Exception as e:
            print(f"Error resolving incident: {e}")
            db.rollback()
        finally:
            if not external_db:
                db.close()

    def _get_recommendations(self, level):
        """Returns actionable advisories based on AQI level."""
        if level == "Severe":
            return [
                "Issue Emergency Health Advisory",
                "Restrict Heavy Vehicle Entry",
                "Deploy Anti-Smog Guns",
                "Advise N95 Mask Usage"
            ]
        elif level == "Very Poor":
            return [
                "Increase Road Sweeping Frequency",
                "Suspend Construction Activity",
                "Advise Vulnerable Groups to Stay Indoors"
            ]
        return ["Monitor Closely"]

    def _predict_trend(self, zone_id):
        """Predicts trend using last 10 minutes of data."""
        history = self.zone_history.get(zone_id, [])
        if len(history) < 5:
            return "Stable"
        
        # Simple slope calculation
        recent_aqis = [h["aqi"] for h in history[-5:]]
        slope = recent_aqis[-1] - recent_aqis[0]
        
        if slope > 15: return "Rising Rapidly"
        if slope > 5: return "Rising"
        if slope < -15: return "Falling Rapidly"
        if slope < -5: return "Falling"
        return "Stable"

    # --------------------------------------------------
    # Cleanup old readings
    # --------------------------------------------------
    def cleanup_old_data(self, days=7):
        """Delete node_readings and zone_readings older than the given number of days."""
        cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)
        db = SessionLocal()
        try:
            db.query(NodeReading).filter(NodeReading.timestamp < cutoff).delete()
            db.query(ZoneReading).filter(ZoneReading.timestamp < cutoff).delete()
            db.commit()
        except Exception:
            raise
        finally:
            db.close()

    # --------------------------------------------------
    # Change city dynamically
    # --------------------------------------------------
    def set_city(self, city_name):
        if city_name.lower() not in CITIES:
            return False

        self._initialize_city(city_name)

        # Clear history for new city context
        self.node_history = {node["id"]: [] for node in self.nodes}
        self.zone_history = {z: [] for z in range(self.rows * self.cols)}

        self.real_zone_cache = {}
        self.last_real_fetch = 0

        return True