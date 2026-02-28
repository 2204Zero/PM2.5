# backend/app/aqi_calculator.py

class AQICalculator:

    def __init__(self, standard="india"):
        self.standard = standard
        self.breakpoints = self._load_breakpoints()

    def _load_breakpoints(self):
        # Indian AQI breakpoints (simplified structured format)
        return {
            "pm25": [
                (0, 30, 0, 50),
                (31, 60, 51, 100),
                (61, 90, 101, 200),
                (91, 120, 201, 300),
                (121, 250, 301, 400),
                (251, 500, 401, 500),
            ],
            "pm10": [
                (0, 50, 0, 50),
                (51, 100, 51, 100),
                (101, 250, 101, 200),
                (251, 350, 201, 300),
                (351, 430, 301, 400),
                (431, 600, 401, 500),
            ],
            "no2": [
                (0, 40, 0, 50),
                (41, 80, 51, 100),
                (81, 180, 101, 200),
                (181, 280, 201, 300),
                (281, 400, 301, 400),
                (401, 600, 401, 500),
            ],
            "co": [
                (0, 1, 0, 50),
                (1.1, 2, 51, 100),
                (2.1, 10, 101, 200),
                (10.1, 17, 201, 300),
                (17.1, 34, 301, 400),
                (34.1, 50, 401, 500),
            ],
            "o3": [
                (0, 50, 0, 50),
                (51, 100, 51, 100),
                (101, 168, 101, 200),
                (169, 208, 201, 300),
                (209, 748, 301, 400),
                (749, 1000, 401, 500),
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