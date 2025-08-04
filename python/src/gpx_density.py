import math
from tabulate import tabulate


class GPXDensityAnalyzer:
    def __init__(self, track_data, radius_meters=100):
        self.track_data = track_data
        self.radius_meters = radius_meters

    def _haversine(self, lat1, lon1, lat2, lon2):
        R = 6371000  # meters
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        d_phi = math.radians(lat2 - lat1)
        d_lambda = math.radians(lon2 - lon1)
        a = math.sin(d_phi / 2)**2 + math.cos(phi1) * \
            math.cos(phi2) * math.sin(d_lambda / 2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def analyze_segment(self, segment):
        results = []
        cumulative_distance = 0.0

        for i, point in enumerate(segment):
            # Density count
            count = sum(
                1 for other in segment
                if self._haversine(point['latitude'], point['longitude'], other['latitude'], other['longitude']) <= self.radius_meters
            )

            # Cumulative distance from previous point
            if i > 0:
                prev = segment[i - 1]
                dist = self._haversine(
                    prev['latitude'], prev['longitude'],
                    point['latitude'], point['longitude']
                )
                cumulative_distance += dist

            results.append({
                'Index': i + 1,
                'Distance from Start (m)': round(cumulative_distance, 2),
                'Latitude': round(point['latitude'], 6),
                'Longitude': round(point['longitude'], 6),
                'Elevation': round(point['elevation'], 2) if point['elevation'] is not None else 'N/A',
                'Density': count
            })

        return results

    def print_density_table(self):
        for t_index, track in enumerate(self.track_data):
            print(f"\nTrack {t_index + 1}")
            for s_index, segment in enumerate(track):
                print(f"  Segment {s_index + 1}")
                table = self.analyze_segment(segment)
                print(tabulate(table, headers="keys", tablefmt="pretty"))
