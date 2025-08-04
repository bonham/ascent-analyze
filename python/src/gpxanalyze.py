from gpx_parser import GPXParser
from gpx_density import GPXDensityAnalyzer

# Path to your GPX file
file_path = './data/Klingen.gpx'

# Create an instance of GPXParser
parser = GPXParser(file_path)

# Retrieve parsed track data
data = parser.get_data()

# Display the structured data
for track_index, track in enumerate(data):
    print(f'Track {track_index + 1}:')
    for segment_index, segment in enumerate(track):
        print(f'  Segment {segment_index + 1}:')
        for point_index, point in enumerate(segment):
            lat = point['latitude']
            lon = point['longitude']
            ele = point['elevation']
            # print(
            #     f'    Point {point_index + 1}: Lat={lat}, Lon={lon}, Ele={ele}')
analyzer = GPXDensityAnalyzer(data, 100)
analyzer.print_density_table()
