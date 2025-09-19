# Railway Processing Service

This is a FastAPI service deployed on Railway that provides PDF text extraction and image processing capabilities for the Leasingbørsen React application.

## Service Endpoints

### Health & Monitoring
- `GET /` - Health check with feature list
- `GET /health` - Simple health status
- `GET /cache/stats` - Image cache statistics

### PDF Processing
- `POST /extract/structured` - Extract structured text from PDF files

### Image Processing (NEW)
- `POST /process-image` - Process car images with:
  - Background removal (via API4.ai)
  - Auto-cropping to remove transparent padding
  - Drop shadow effects
  - Multiple size generation (grid, detail, full)
  - In-memory caching for performance

## Usage

### PDF Extraction
The main React application calls this service at `https://leasingborsen-production.up.railway.app/extract/structured` to extract text from uploaded PDF files before sending the text to AI processing.

### Image Processing
```json
POST /process-image
{
  "image_base64": "base64_encoded_image",
  "filename": "car.jpg",
  "options": {
    "remove_background": true,
    "auto_crop": true,
    "add_shadow": true,
    "create_sizes": true
  }
}
```

## Dependencies

### Core
- FastAPI: Web framework
- pdfplumber: PDF text extraction
- uvicorn: ASGI server

### Image Processing
- Pillow: Image manipulation
- numpy: Array operations for cropping
- aiohttp: Async HTTP for API4.ai
- tenacity: Retry logic for external APIs

### Testing
- pytest: Test framework
- httpx: API testing

## Deployment

This service is automatically deployed to Railway when changes are pushed to this directory.

### Railway Configuration Files

- `Procfile` - Specifies how to start the service
- `pip.conf` - Handles externally-managed environment in Nix
- `runtime.txt` - Specifies Python version (3.11.x)
- `requirements.txt` - Python package dependencies

### Start Command

The service starts with: `uvicorn app:app --host 0.0.0.0 --port $PORT`

Where `$PORT` is provided by Railway's environment.

## Environment Variables

- `PORT` - Port to run the service on (provided by Railway)
- `API4AI_KEY` - API key for API4.ai background removal service (required for image processing)

## Testing

Run tests locally:
```bash
cd railway-pdfplumber-poc
pip install -r requirements.txt
pytest
```

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python app.py

# Or with uvicorn
uvicorn app:app --reload --port 8000
```

Access at http://localhost:8000