import geopandas as gpd
import json
import requests
from io import BytesIO
from flask import request, jsonify
from functions_framework import http
import networkx as nx
import osmnx as ox
import numpy as np
from typing import List
import tempfile
import gzip
import shutil
from shapely.geometry import LineString
import shapely.ops as ops

# Constants
PARQUET_URL = "https://storage.googleapis.com/skagitgeojson/merged_parcels.parquet"
GRAPH_DRIVE_URL = "https://storage.googleapis.com/skagitgeojson/skagit_drive.graphml.gz"
GRAPH_WALK_URL = "https://storage.googleapis.com/skagitgeojson/skagit_walk.graphml.gz"
OFFICE_LAT = 48.4181454
OFFICE_LON = -122.339589

# Load GraphML from URL
def load_compressed_graphml(url: str):
    print(f"Downloading compressed graph from {url}...")
    
    # Download the .gz file to temp
    with tempfile.NamedTemporaryFile(suffix=".graphml.gz", delete=False) as gz_temp:
        r = requests.get(url)
        r.raise_for_status()
        gz_temp.write(r.content)
        gz_path = gz_temp.name

    # Extract the .graphml content
    with gzip.open(gz_path, 'rb') as f_in:
        with tempfile.NamedTemporaryFile(suffix=".graphml", delete=False) as xml_temp:
            shutil.copyfileobj(f_in, xml_temp)
            graphml_path = xml_temp.name

    print(f"Loaded and extracted: {graphml_path}")
    return ox.load_graphml(graphml_path)

# Load graphs at cold start
print("Loading OSMnx graphs...")
G_DRIVE = load_compressed_graphml(GRAPH_DRIVE_URL)
G_WALK = load_compressed_graphml(GRAPH_WALK_URL)
print("Graphs loaded.")

def retain_largest_component(graph):
    largest_cc = max(nx.connected_components(graph.to_undirected()), key=len)
    return graph.subgraph(largest_cc).copy()

G_DRIVE = retain_largest_component(G_DRIVE)
G_WALK = retain_largest_component(G_WALK)

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '3600'
    }

def load_parquet_data():
    try:
        response = requests.get(PARQUET_URL)
        response.raise_for_status()
        parquet_bytes = BytesIO(response.content)
        cols = ['Parcel Number', 'SITUS_ADDR', 'SUB_ADDRES', 'geometry', 'latitude', 'longitude']
        gdf = gpd.read_parquet(parquet_bytes, columns=cols)
        return gdf.to_crs(epsg=4326)
    except Exception as e:
        print(f"Error loading parcel data: {e}")
        return None



def snap_parcel_to_road_node(graph, parcel_geom):
    parcel_boundary = parcel_geom.exterior
    rep_point = parcel_geom.representative_point()

    u, v, key = ox.distance.nearest_edges(graph, X=rep_point.x, Y=rep_point.y)
    u_coords = (graph.nodes[u]['x'], graph.nodes[u]['y'])
    v_coords = (graph.nodes[v]['x'], graph.nodes[v]['y'])
    edge_line = LineString([u_coords, v_coords])

    # Nearest point on parcel to edge
    nearest = nearest_points(parcel_boundary, edge_line)[0]

    # Snap that point to nearest node in graph
    node = ox.distance.nearest_nodes(graph, X=nearest.x, Y=nearest.y)
    return node



def snap_to_graph(graph, lat, lon):
    """
    Snap a point to the nearest edge in the graph and return a node ID for routing.
    This avoids multiple points collapsing to the same node when they fall near the same intersection.
    """
    try:
        # Snap to nearest edge (returns u, v, key)
        u, v, key = ox.distance.nearest_edges(graph, X=lon, Y=lat)
        edge_data = graph[u][v][key]

        # Choose the closer node (u or v) to the input point
        u_point = graph.nodes[u]
        v_point = graph.nodes[v]

        dist_to_u = ((u_point['x'] - lon)**2 + (u_point['y'] - lat)**2)**0.5
        dist_to_v = ((v_point['x'] - lon)**2 + (v_point['y'] - lat)**2)**0.5

        nearest_node = u if dist_to_u < dist_to_v else v

        print(f"[EDGE SNAP] ({lat:.5f}, {lon:.5f}) → edge ({u}, {v}) → node {nearest_node}")
        return nearest_node

    except Exception as e:
        print(f"[SNAP ERROR] ({lat}, {lon}) → {e}")
        raise


def build_time_matrix(graph, node_ids):
    
    n = len(node_ids)
    matrix = np.full((n, n), np.inf)
    for i in range(n):
        for j in range(n):
            if i != j:
                try:
                    matrix[i][j] = nx.shortest_path_length(
                        graph, node_ids[i], node_ids[j], weight='travel_time')
                except Exception as e:
                    print(f"[UNREACHABLE] {i}->{j} (nodes {node_ids[i]} -> {node_ids[j]}) : {e}")
    return matrix


def print_node_info(graph, coords):
    print("[SNAPPED NODE IDS]")
    for i, (lat, lon) in enumerate(coords):
        try:
            node = snap_to_graph(graph, lat, lon)
            print(f"{i}: ({lat:.5f}, {lon:.5f}) → Node ID: {node}")
        except Exception as e:
            print(f"{i}: ({lat}, {lon}) → Snap failed: {e}")

def solve_tsp(matrix):
    G = nx.complete_graph(len(matrix))
    for i in range(len(matrix)):
        for j in range(len(matrix)):
            G[i][j]['weight'] = matrix[i][j]
    return nx.approximation.traveling_salesman_problem(G)

# ✅ Main Cloud Function Entry
@http
def route_handler(request):
    if request.method == 'OPTIONS':
        return ('', 204, cors_headers())

    headers = cors_headers()

    if request.method != 'POST':
        return (jsonify({'error': 'Method not allowed'}), 405, headers)

    try:
        data = request.get_json()
        action = data.get('action')
        parcel_ids = data.get('parcel_ids', [])

        if not action or not parcel_ids:
            return (jsonify({'error': 'Missing action or parcel_ids'}), 400, headers)

        if action == "get_parcels":
            gdf = load_parquet_data()
            if gdf is None:
                return (jsonify({'error': 'Failed to load parcel data'}), 500, headers)

            filtered = gdf[gdf['Parcel Number'].isin(parcel_ids)].copy()
            filtered = filtered.drop_duplicates(subset=['Parcel Number'])
            if filtered.empty:
                return (jsonify({'error': 'No parcels found'}), 404, headers)

            projected = filtered.to_crs(epsg=3857)

            parcels = []
            for _, row in projected.iterrows():
                parcel_id = row['Parcel Number']
                parcel_geom = row['geometry']  # projected geometry for snapping
            
                try:
                    node = snap_parcel_to_road_node(G_DRIVE, parcel_geom)
                    node_data = G_DRIVE.nodes[node]
                    lat, lon = node_data['y'], node_data['x']
            
                    # Get original WGS84 geometry from the unprojected 'filtered' dataframe
                    original_geom = filtered.loc[filtered['Parcel Number'] == parcel_id, 'geometry'].values[0]
            
                    parcels.append({
                        'parcel_id': parcel_id,
                        'lat': lat,
                        'lon': lon,
                        'geometry': original_geom.__geo_interface__  # ✅ Already EPSG:4326
                    })
            
                except Exception as e:
                    print(f"[SNAP FAIL] Parcel {parcel_id} skipped: {e}")


            if not parcels:
                return (jsonify({'error': 'All parcels failed to snap'}), 500, headers)

            return (jsonify({'success': True, 'parcels': parcels, 'count': len(parcels)}), 200, headers)


        elif action == "optimize_route":
            mode = data.get('mode', 'drive')
            gdf = load_parquet_data()
            if gdf is None:
                return (jsonify({'error': 'Failed to load parcel data'}), 500, headers)

            graph = G_DRIVE if mode == 'drive' else G_WALK
            filtered = gdf[gdf['Parcel Number'].isin(parcel_ids)].copy()
            filtered = filtered.drop_duplicates(subset=['Parcel Number'])  # ✅ fix duplicates
            if filtered.empty:
                return (jsonify({'error': 'No matching parcels'}), 404, headers)

            projected = filtered.to_crs(epsg=3857)
            centroids = projected.geometry.centroid.to_crs(epsg=4326)
            filtered['lat'] = centroids.y
            filtered['lon'] = centroids.x

            coords = [(OFFICE_LAT, OFFICE_LON)] + list(zip(filtered['lat'], filtered['lon']))
            print("[COORDINATES]")
            for idx, (lat, lon) in enumerate(coords):
                print(f"{idx}: ({lat}, {lon})")

            node_ids = []

            print(f"[OPTIMIZE] Snapping {len(coords)} coords...")

            try:
                for lat, lon in coords:
                    node = snap_parcel_to_road_node(graph, row['geometry'])
                    node_ids.append(node)
            except Exception as e:
                print(f"[SNAP ERROR] {e}")
                return (jsonify({'error': f'Failed to snap node: {str(e)}'}), 500, headers)

            if len(node_ids) != len(coords):
                print(f"[ERROR] Snap count mismatch: got {len(node_ids)}, expected {len(coords)}")
                return (jsonify({'error': 'Snap failed for one or more coordinates'}), 500, headers)

            try:
                print_node_info(graph, coords)
                matrix = build_time_matrix(graph, node_ids)
                print(f"[MATRIX] Built time matrix of size {matrix.shape}")
                order = solve_tsp(matrix)
                print(f"[TSP] Order: {order}")
            except Exception as e:
                print(f"[TSP ERROR] {e}")
                return (jsonify({'error': f'TSP failed: {str(e)}'}), 500, headers)

            try:
                ordered_parcels = [parcel_ids[i - 1] for i in order[1:]]  # skip office
                total_time_min = round(sum(matrix[order[i]][order[i + 1]] for i in range(len(order) - 1)))
                return (jsonify({
                    'status': 'success',
                    'optimized_order': ordered_parcels,
                    'total_time': total_time_min
                }), 200, headers)
            except Exception as e:
                print(f"[FINAL BUILD ERROR] {e}")
                return (jsonify({'error': f'Failed to build final route response: {str(e)}'}), 500, headers)


    except Exception as e:
        print(f"Error in route_handler: {e}")
        return (jsonify({'error': str(e)}), 500, headers)
