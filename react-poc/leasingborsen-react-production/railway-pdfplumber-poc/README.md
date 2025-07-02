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