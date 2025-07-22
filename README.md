# pRouting - Parcel Route Optimization

A web application for optimizing delivery routes for agricultural parcels, refactored to use direct HTTP(S) links for geospatial data instead of Google Cloud Storage.

## Features

- Route optimization for agricultural parcel deliveries
- Support for different optimization modes (fast, efficient, thorough)
- Interactive web interface with map visualization
- RESTful API backend with geospatial data processing

## Backend Setup

### Environment Variables

The backend now uses direct HTTP(S) URLs for data sources instead of Google Cloud Storage:

- `SHAPEFILE_URL`: Direct URL to a shapefile (zip format containing .shp, .shx, .dbf files)
- `ATTR_CSV_URL`: Direct URL to a CSV file containing parcel attributes
- `PORT`: Server port (optional, defaults to 5000)

### Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export SHAPEFILE_URL="https://example.com/path/to/parcels.zip"
export ATTR_CSV_URL="https://example.com/path/to/attributes.csv"
```

3. Run the Flask application:
```bash
python app.py
```

The server will start on `http://localhost:5000` (or the port specified by the `PORT` environment variable).

### API Endpoints

#### POST /
Route optimization endpoint.

**Request Body:**
```json
{
  "parcels": ["P000001", "P000002", "P000003"],
  "mode": "efficient",
  "return_map": true
}
```

**Response:**
```json
{
  "routes": [
    {
      "route_id": 1,
      "total_time": 45,
      "stops": [
        {
          "parcel_id": "P000001",
          "order": 1,
          "lat": 48.5,
          "lng": -122.3,
          "estimated_time": 5
        }
      ]
    }
  ],
  "stats": {
    "total_routes": 1,
    "found_parcels": 3,
    "not_found_parcels": []
  }
}
```

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "shapefile_url": true,
  "attr_csv_url": true
}
```

### Data Requirements

#### Shapefile Format
The shapefile should contain parcel geometries with a `parcel_id` field matching the format "P######".

#### CSV Attributes Format
The CSV file should contain parcel attributes with the following columns:
- `parcel_id`: Matching the shapefile parcel IDs
- Additional attribute columns as needed for route optimization

### Deployment

For production deployment, use a WSGI server like Gunicorn:

```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

## Frontend

The frontend is a single-page application that provides an interface for:
- Entering parcel IDs
- Selecting optimization mode
- Viewing optimized routes on interactive maps
- Exporting route data

Open `index.html` in a web browser to use the application.

## Development

### Testing the Backend

You can test the backend directly using curl:

```bash
curl -X POST http://localhost:5000/ \
  -H "Content-Type: application/json" \
  -d '{"parcels": ["P000001", "P000002"], "mode": "efficient", "return_map": true}'
```

### Changes from Previous Version

- **Removed**: Google Cloud Storage client and authentication
- **Removed**: `GCS_BUCKET_NAME` and `GCS_OBJECT_PATH` environment variables
- **Added**: `SHAPEFILE_URL` and `ATTR_CSV_URL` environment variables
- **Added**: Direct HTTP(S) file download using requests library
- **Updated**: Temporary file handling for downloaded data
- **Simplified**: Deployment without GCS credentials

## Dependencies

- Flask: Web framework
- geopandas: Geospatial data processing
- pandas: Data manipulation
- requests: HTTP client for file downloads
- flask-cors: Cross-origin resource sharing
- shapely: Geometric operations
- numpy: Numerical computations
- gunicorn: WSGI HTTP server (for production)