import gpxpy


class GPXParser:
    def __init__(self, file_path):
        self.file_path = file_path
        self.tracks = self._parse_gpx()

    def _parse_gpx(self):
        with open(self.file_path, 'r') as gpx_file:
            gpx = gpxpy.parse(gpx_file)

        all_tracks = []
        for track in gpx.tracks:
            track_data = []
            for segment in track.segments:
                segment_data = []
                for point in segment.points:
                    segment_data.append({
                        'latitude': point.latitude,
                        'longitude': point.longitude,
                        'elevation': point.elevation
                    })
                track_data.append(segment_data)
            all_tracks.append(track_data)

        return all_tracks

    def get_data(self):
        return self.tracks
