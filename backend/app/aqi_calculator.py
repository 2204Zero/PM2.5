# backend/app/aqi_calculator.py

class AQICalculator:

    def __init__(self, standard="india"):
        self.standard = standard
        self.breakpoints = self._load_breakpoints()

    def _load_breakpoints(self):
        # Indian AQI breakpoints (Continuous to handle floating-point results)
        return {
            "pm25": [
                (0, 30, 0, 50),
                (30, 60, 50, 100),
                (60, 90, 100, 200),
                (90, 120, 200, 300),
                (120, 250, 300, 400),
                (250, 500, 400, 500),
            ],
            "pm10": [
                (0, 50, 0, 50),
                (50, 100, 50, 100),
                (100, 250, 100, 200),
                (250, 350, 200, 300),
                (350, 430, 300, 400),
                (430, 600, 400, 500),
            ],
            "no2": [
                (0, 40, 0, 50),
                (40, 80, 50, 100),
                (80, 180, 100, 200),
                (180, 280, 200, 300),
                (280, 400, 300, 400),
                (400, 600, 400, 500),
            ],
            "co": [
                (0, 1, 0, 50),
                (1, 2, 50, 100),
                (2, 10, 100, 200),
                (10, 17, 200, 300),
                (17, 34, 300, 400),
                (34, 50, 400, 500),
            ],
            "o3": [
                (0, 50, 0, 50),
                (50, 100, 50, 100),
                (100, 168, 100, 200),
                (168, 208, 200, 300),
                (208, 748, 300, 400),
                (748, 1000, 400, 500),
            ],
        }

    def _calculate_sub_index(self, concentration, pollutant):
        for bp_lo, bp_hi, i_lo, i_hi in self.breakpoints[pollutant]:
            if bp_lo <= concentration <= bp_hi:
                return ((i_hi - i_lo) / (bp_hi - bp_lo)) * (concentration - bp_lo) + i_lo
        return 500  # beyond scale

    def calculate_aqi(self, pollutants_dict):
        sub_indices = {}

        for pollutant, value in pollutants_dict.items():
            if pollutant in self.breakpoints:
                sub_indices[pollutant] = self._calculate_sub_index(value, pollutant)

        if not sub_indices:
            return None

        dominant = max(sub_indices, key=sub_indices.get)
        final_aqi = sub_indices[dominant]

        return {
            "aqi": round(final_aqi, 2),
            "dominant_pollutant": dominant,
            "sub_indices": sub_indices
        }

    def get_aqi_level(self, aqi):
        """Standard Indian AQI levels, adjusted for user requested alert thresholds."""
        if aqi <= 50:
            return "Good"
        elif aqi <= 100:
            return "Satisfactory"
        elif aqi <= 200:
            return "Moderate"
        elif aqi < 300:
            return "Moderate" # User wants Poor >= 300
        elif aqi < 400:
            return "Poor" # User wants Poor >= 300
        elif aqi == 400:
            return "Very Poor" # User wants Very Poor >= 400
        else:
            return "Severe" # User wants Severe > 400