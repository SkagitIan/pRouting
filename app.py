#!/usr/bin/env python3
"""
pRouting Backend - Route Optimization Service
Refactored to use direct HTTP(S) links instead of Google Cloud Storage
"""

import os
import tempfile
import requests
import json
import math
import logging

# Try to import optional packages
try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("Flask not available - using simple HTTP server")

try:
    import geopandas as gpd
    import pandas as pd
    import numpy as np
    from shapely.geometry import Point
    GEO_AVAILABLE = True
except ImportError:
    GEO_AVAILABLE = False
    print("Geospatial packages not available - using dummy data")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if FLASK_AVAILABLE:
    app = Flask(__name__)
    CORS(app)

# Environment variables for data sources
SHAPEFILE_URL = os.environ.get('SHAPEFILE_URL')
ATTR_CSV_URL = os.environ.get('ATTR_CSV_URL')

def download_file_to_temp(url, suffix=None):
    """Download a file from URL to a temporary file"""
    if not url:
        raise ValueError("URL cannot be empty")
    
    logger.info(f"Downloading file from: {url}")
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    
    # Write content to temp file
    for chunk in response.iter_content(chunk_size=8192):
        temp_file.write(chunk)
    
    temp_file.close()
    logger.info(f"File downloaded to: {temp_file.name}")
    return temp_file.name

def load_geospatial_data():
    """Load shapefile and attribute CSV data from public URLs"""
    shapefile_path = None
    csv_path = None
    
    try:
        if GEO_AVAILABLE:
            # Download shapefile
            if SHAPEFILE_URL:
                shapefile_path = download_file_to_temp(SHAPEFILE_URL, suffix='.zip')
                # Load shapefile (assuming it's a zip file with shapefile components)
                gdf = gpd.read_file(shapefile_path)
            else:
                # Create dummy geospatial data for demo purposes
                logger.warning("No SHAPEFILE_URL provided, using dummy data")
                gdf = create_dummy_parcel_data()
            
            # Download CSV attributes
            if ATTR_CSV_URL:
                csv_path = download_file_to_temp(ATTR_CSV_URL, suffix='.csv')
                attrs_df = pd.read_csv(csv_path)
            else:
                # Create dummy attribute data
                logger.warning("No ATTR_CSV_URL provided, using dummy data")
                attrs_df = create_dummy_attr_data()
        else:
            # Use simple Python data structures
            gdf = create_simple_parcel_data()
            attrs_df = create_simple_attr_data()
        
        return gdf, attrs_df
        
    finally:
        # Clean up temporary files
        for path in [shapefile_path, csv_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception as e:
                    logger.warning(f"Failed to delete temp file {path}: {e}")

def create_simple_parcel_data():
    """Create simple parcel data without geopandas"""
    import random
    random.seed(42)
    
    parcels = []
    for i in range(1, 101):
        parcel_id = f"P{i:06d}"
        # Simulate Skagit County coordinates
        lon = random.uniform(-122.7, -121.8)
        lat = random.uniform(48.2, 48.8)
        parcels.append({
            'parcel_id': parcel_id,
            'lat': lat,
            'lng': lon
        })
    
    return parcels

def create_simple_attr_data():
    """Create simple attribute data without pandas"""
    import random
    random.seed(42)
    
    attrs = []
    for i in range(1, 101):
        parcel_id = f"P{i:06d}"
        attrs.append({
            'parcel_id': parcel_id,
            'field_type': random.choice(['corn', 'wheat', 'soy']),
            'acreage': random.uniform(1, 50),
            'priority': random.choice(['high', 'medium', 'low'])
        })
    
    return attrs

def create_dummy_parcel_data():
    """Create dummy parcel geospatial data for testing"""
    if not GEO_AVAILABLE:
        return create_simple_parcel_data()
    
    # Generate some dummy parcel data
    import numpy as np
    np.random.seed(42)
    n_parcels = 100
    
    # Generate random coordinates (simulate Skagit County area)
    lons = np.random.uniform(-122.7, -121.8, n_parcels)
    lats = np.random.uniform(48.2, 48.8, n_parcels)
    
    parcel_ids = [f"P{i:06d}" for i in range(1, n_parcels + 1)]
    
    gdf = gpd.GeoDataFrame({
        'parcel_id': parcel_ids,
        'geometry': [Point(lon, lat) for lon, lat in zip(lons, lats)]
    })
    
    return gdf

def create_dummy_attr_data():
    """Create dummy attribute data for testing"""
    if not GEO_AVAILABLE:
        return create_simple_attr_data()
    
    import numpy as np
    np.random.seed(42)
    n_parcels = 100
    
    parcel_ids = [f"P{i:06d}" for i in range(1, n_parcels + 1)]
    
    import pandas as pd
    attrs_df = pd.DataFrame({
        'parcel_id': parcel_ids,
        'field_type': np.random.choice(['corn', 'wheat', 'soy'], n_parcels),
        'acreage': np.random.uniform(1, 50, n_parcels),
        'priority': np.random.choice(['high', 'medium', 'low'], n_parcels)
    })
    
    return attrs_df

def optimize_routes(parcels, mode='efficient', gdf=None, attrs_df=None):
    """Optimize routes for given parcels"""
    if gdf is None or attrs_df is None:
        gdf, attrs_df = load_geospatial_data()
    
    # Filter to requested parcels
    found_parcels = []
    not_found_parcels = []
    
    if GEO_AVAILABLE and hasattr(gdf, 'values'):
        # Using geopandas
        for parcel in parcels:
            if parcel in gdf['parcel_id'].values:
                found_parcels.append(parcel)
            else:
                not_found_parcels.append(parcel)
        parcel_data = gdf[gdf['parcel_id'].isin(found_parcels)].copy()
    else:
        # Using simple data structures
        parcel_lookup = {p['parcel_id']: p for p in gdf}
        for parcel in parcels:
            if parcel in parcel_lookup:
                found_parcels.append(parcel)
            else:
                not_found_parcels.append(parcel)
        parcel_data = [parcel_lookup[p] for p in found_parcels]
    
    if len(parcel_data) == 0:
        return {
            'routes': [],
            'stats': {
                'total_routes': 0,
                'found_parcels': 0,
                'not_found_parcels': not_found_parcels
            }
        }
    
    # Simple route optimization (group by proximity)
    routes = create_routes_by_proximity(parcel_data, mode)
    
    return {
        'routes': routes,
        'stats': {
            'total_routes': len(routes),
            'found_parcels': len(found_parcels),
            'not_found_parcels': not_found_parcels
        }
    }

def create_routes_by_proximity(parcel_data, mode):
    """Create routes by grouping nearby parcels"""
    routes = []
    
    # Simple clustering based on mode
    if mode == 'fast':
        max_parcels_per_route = 15
    elif mode == 'thorough':
        max_parcels_per_route = 8
    else:  # efficient
        max_parcels_per_route = 12
    
    if GEO_AVAILABLE and hasattr(parcel_data, 'to_dict'):
        # Using geopandas
        parcels_list = parcel_data.to_dict('records')
        
        while parcels_list:
            route_parcels = [parcels_list.pop(0)]
            current_center = route_parcels[0]['geometry']
            
            # Add nearby parcels to this route
            while len(route_parcels) < max_parcels_per_route and parcels_list:
                # Find closest remaining parcel
                min_dist = float('inf')
                closest_idx = 0
                
                for i, parcel in enumerate(parcels_list):
                    dist = current_center.distance(parcel['geometry'])
                    if dist < min_dist:
                        min_dist = dist
                        closest_idx = i
                
                if parcels_list:  # Still have parcels to add
                    route_parcels.append(parcels_list.pop(closest_idx))
            
            # Create stops list
            stops = []
            for i, parcel in enumerate(route_parcels):
                stops.append({
                    'parcel_id': parcel['parcel_id'],
                    'order': i + 1,
                    'lat': parcel['geometry'].y,
                    'lng': parcel['geometry'].x,
                    'estimated_time': 5
                })
                
    else:
        # Using simple data structures
        parcels_list = list(parcel_data)
        
        while parcels_list:
            route_parcels = [parcels_list.pop(0)]
            current_lat = route_parcels[0]['lat']
            current_lng = route_parcels[0]['lng']
            
            # Add nearby parcels to this route
            while len(route_parcels) < max_parcels_per_route and parcels_list:
                # Find closest remaining parcel using simple distance
                min_dist = float('inf')
                closest_idx = 0
                
                for i, parcel in enumerate(parcels_list):
                    # Simple Euclidean distance
                    dist = math.sqrt((current_lat - parcel['lat'])**2 + (current_lng - parcel['lng'])**2)
                    if dist < min_dist:
                        min_dist = dist
                        closest_idx = i
                
                if parcels_list:  # Still have parcels to add
                    route_parcels.append(parcels_list.pop(closest_idx))
            
            # Create stops list
            stops = []
            for i, parcel in enumerate(route_parcels):
                stops.append({
                    'parcel_id': parcel['parcel_id'],
                    'order': i + 1,
                    'lat': parcel['lat'],
                    'lng': parcel['lng'],
                    'estimated_time': 5
                })
    
    # Calculate route stats
    route_time = len(stops) * 5 + 20  # 5 min per stop + 20 min travel
    
    routes.append({
        'route_id': len(routes) + 1,
        'total_time': route_time,
        'stops': stops
    })
    
    return routes

if FLASK_AVAILABLE:
    @app.route('/', methods=['POST'])
    def optimize_routes_endpoint():
        """Main endpoint for route optimization"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No JSON data provided'}), 400
            
            parcels = data.get('parcels', [])
            mode = data.get('mode', 'efficient')
            return_map = data.get('return_map', False)
            
            if not parcels:
                return jsonify({'error': 'No parcels provided'}), 400
            
            logger.info(f"Processing {len(parcels)} parcels with mode: {mode}")
            
            # Load data and optimize routes
            result = optimize_routes(parcels, mode)
            
            logger.info(f"Generated {result['stats']['total_routes']} routes")
            
            return jsonify(result)
            
        except Exception as e:
            logger.error(f"Error processing request: {str(e)}")
            return jsonify({'error': f'Internal server error: {str(e)}'}), 500

    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        return jsonify({
            'status': 'healthy',
            'shapefile_url': bool(SHAPEFILE_URL),
            'attr_csv_url': bool(ATTR_CSV_URL),
            'geo_available': GEO_AVAILABLE
        })

    if __name__ == '__main__':
        port = int(os.environ.get('PORT', 5000))
        app.run(host='0.0.0.0', port=port, debug=True)
        
else:
    # Simple HTTP server implementation without Flask
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import urllib.parse
    
    class RouteHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path == '/':
                self.handle_optimize_routes()
            else:
                self.send_error(404)
        
        def do_GET(self):
            if self.path == '/health':
                self.handle_health_check()
            else:
                self.send_error(404)
        
        def handle_optimize_routes(self):
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                parcels = data.get('parcels', [])
                mode = data.get('mode', 'efficient')
                
                if not parcels:
                    self.send_json_response({'error': 'No parcels provided'}, 400)
                    return
                
                result = optimize_routes(parcels, mode)
                self.send_json_response(result)
                
            except Exception as e:
                self.send_json_response({'error': str(e)}, 500)
        
        def handle_health_check(self):
            result = {
                'status': 'healthy',
                'shapefile_url': bool(SHAPEFILE_URL),
                'attr_csv_url': bool(ATTR_CSV_URL),
                'geo_available': GEO_AVAILABLE
            }
            self.send_json_response(result)
        
        def send_json_response(self, data, status=200):
            self.send_response(status)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        
        def do_OPTIONS(self):
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
    
    if __name__ == '__main__':
        port = int(os.environ.get('PORT', 5000))
        server = HTTPServer(('0.0.0.0', port), RouteHandler)
        print(f"Starting server on port {port}")
        server.serve_forever()