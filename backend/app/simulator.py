# backend/app/simulator.py

import random
import datetime
from app.aqi_calculator import AQICalculator


class AQISimulator:

    def __init__(self, nodes_per_zone=40, rows=6, cols=6):
        self.rows = rows
        self.cols = cols
        self.nodes_per_zone = nodes_per_zone

        self.num_nodes = rows * cols * nodes_per_zone

        # Delhi-like bounding box
        self.base_lat = 28.55
        self.base_lon = 77.15
        self.lat_range = 0.06
        self.lon_range = 0.06

        self.aqi_engine = AQICalculator(standard="india")

        self.nodes = self._generate_nodes()

        self.node_history = {node["id"]: [] for node in self.nodes}
        self.zone_history = {z: [] for z in range(self.rows * self.cols)}

    # --------------------------------------------------
    # Generate structured nodes per zone
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
    # Simulate pollutants
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
    # Simulation cycle
    # --------------------------------------------------
    def simulate(self):
        timestamp = datetime.datetime.now().isoformat()

        for node in self.nodes:
            pollutants = self._simulate_pollutants()
            node.update(pollutants)

            self.node_history[node["id"]].append({
                "timestamp": timestamp,
                **pollutants
            })

            if len(self.node_history[node["id"]]) > 50:
                self.node_history[node["id"]] = self.node_history[node["id"]][-50:]

        self._update_zone_history(timestamp)

        return self.nodes

    # --------------------------------------------------
    # Zone aggregation
    # --------------------------------------------------
    def _update_zone_history(self, timestamp):

        zone_pollutants = {z: [] for z in range(self.rows * self.cols)}

        for node in self.nodes:
            zone_pollutants[node["zone"]].append(node)

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

            trend = self._calculate_trend(zone_id, aqi_result["aqi"])

            zone_record = {
                "timestamp": timestamp,
                "avg_pollutants": avg_data,
                "aqi": aqi_result["aqi"],
                "dominant_pollutant": aqi_result["dominant_pollutant"],
                "trend": trend
            }

            self.zone_history[zone_id].append(zone_record)

            if len(self.zone_history[zone_id]) > 50:
                self.zone_history[zone_id] = self.zone_history[zone_id][-50:]

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
    # Zone summary with centroid
    # --------------------------------------------------
    def get_zone_summary(self):

        summary = []

        for zone_id, history in self.zone_history.items():

            if not history:
                continue

            latest = history[-1]

            zone_nodes = [n for n in self.nodes if n["zone"] == zone_id]

            if not zone_nodes:
                continue

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