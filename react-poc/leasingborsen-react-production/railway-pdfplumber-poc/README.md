# Railway PDF Extraction Service

This is a minimal FastAPI service deployed on Railway that provides PDF text extraction capabilities for the Leasingbørsen React application.

## Service Endpoints

- `GET /` - Health check
- `GET /health` - Health status
- `POST /extract/structured` - Extract structured text from PDF files

## Usage

The main React application calls this service at `https://leasingborsen-production.up.railway.app/extract/structured` to extract text from uploaded PDF files before sending the text to AI processing.

## Dependencies

- FastAPI: Web framework
- pdfplumber: PDF text extraction
- uvicorn: ASGI server

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