"""
Geospatial utilities — calculates distance between two coordinates.
"""

from math import radians, sin, cos, sqrt, atan2

def haversine_distance_km(lat1, lon1, lat2, lon2) -> float:
    """Returns distance in kilometers between two lat/lon points."""
    R = 6371  # Earth's radius in km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c