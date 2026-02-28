import random
import datetime


class AQISimulator:

    def __init__(self, num_nodes=100):
        self.num_nodes = num_nodes
        self.nodes = self._generate_nodes()
        self.history = {node["id"]: [] for node in self.nodes}

    def _generate_nodes(self):
        base_lat = 28.6139
        base_lon = 77.2090

        nodes = []

        for i in range(self.num_nodes):
            nodes.append({
                "id": i,
                "latitude": base_lat + random.uniform(-0.02, 0.02),
                "longitude": base_lon + random.uniform(-0.02, 0.02),
                "pm25": random.randint(20, 80),
                "category": "Moderate"
            })

        return nodes

    def _get_aqi_category(self, pm25):
        if pm25 <= 50:
            return "Good"
        elif pm25 <= 100:
            return "Moderate"
        elif pm25 <= 150:
            return "Unhealthy for Sensitive Groups"
        elif pm25 <= 200:
            return "Unhealthy"
        else:
            return "Hazardous"

    def simulate(self):
        current_hour = datetime.datetime.now().hour
        timestamp = datetime.datetime.now().isoformat()

        for node in self.nodes:

            base = 40

            if 7 <= current_hour <= 10:
                spike = random.randint(20, 60)
            elif 17 <= current_hour <= 21:
                spike = random.randint(30, 70)
            else:
                spike = random.randint(-10, 10)

            anomaly = 0
            if random.random() < 0.01:
                anomaly = random.randint(100, 200)

            pm25 = max(5, base + spike + anomaly)

            node["pm25"] = pm25
            node["category"] = self._get_aqi_category(pm25)

            # Save to history
            self.history[node["id"]].append({
                "timestamp": timestamp,
                "pm25": pm25
            })

            # Keep only last 50 readings
            if len(self.history[node["id"]]) > 50:
                self.history[node["id"]] = self.history[node["id"]][-50:]

        return self.nodes

    def get_history(self, node_id):
        return self.history.get(node_id, [])
    
    def get_last_n_pm25(self, node_id, n=10):
        history = self.history.get(node_id, [])
        return [entry["pm25"] for entry in history[-n:]]