"""
FastAPI integration example for OpenAI PDF Extractor
Demonstrates how to integrate the extractor into your existing FastAPI application
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import json
from openai_pdf_extractor import OpenAI_PDF_Extractor
import os

app = FastAPI(title="OpenAI PDF Leasing Extractor", version="1.0.0")

# Initialize extractor (can be done once at startup)
try:
    extractor = OpenAI_PDF_Extractor()
    print("✅ OpenAI PDF Extractor initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize extractor: {str(e)}")
    extractor = None

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "OpenAI PDF Leasing Extractor API",
        "status": "ready" if extractor else "error",
        "endpoints": [
            "/extract-pdf - POST endpoint for PDF extraction",
            "/health - Health check"
        ]
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy" if extractor else "unhealthy",
        "extractor_ready": extractor is not None,
        "openai_api_key_set": bool(os.getenv('OPENAI_API_KEY'))
    }

@app.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    """
    Extract leasing data from uploaded PDF file
    
    Returns:
        JSON with structured leasing data
    """
    
    # Validate extractor is available
    if not extractor:
        raise HTTPException(
            status_code=503, 
            detail="PDF extractor service unavailable. Check OpenAI API key configuration."
        )
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )
    
    # Check file size (limit to 10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    try:
        # Read file content
        pdf_data = await file.read()
        
        if len(pdf_data) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        if len(pdf_data) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty file uploaded"
            )
        
        # Extract data using OpenAI
        result = extractor.extract_car_leasing_data(pdf_data)
        
        if result['status'] == 'success':
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": f"Successfully extracted data from {file.filename}",
                    "data": result['data'],
                    "metadata": {
                        **result['metadata'],
                        "filename": file.filename,
                        "file_size_bytes": len(pdf_data)
                    }
                }
            )
        else:
            return JSONResponse(
                status_code=422,
                content={
                    "success": False,
                    "message": "Failed to extract data from PDF",
                    "error": result['error'],
                    "filename": file.filename
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.post("/extract-pdf-base64")
async def extract_pdf_base64(request: dict):
    """
    Extract leasing data from base64 encoded PDF
    
    Request body:
    {
        "pdf_base64": "base64-encoded-pdf-data",
        "filename": "optional-filename.pdf"
    }
    """
    
    if not extractor:
        raise HTTPException(
            status_code=503, 
            detail="PDF extractor service unavailable"
        )
    
    try:
        import base64
        
        pdf_base64 = request.get('pdf_base64')
        filename = request.get('filename', 'uploaded.pdf')
        
        if not pdf_base64:
            raise HTTPException(
                status_code=400,
                detail="pdf_base64 field is required"
            )
        
        # Decode base64
        pdf_data = base64.b64decode(pdf_base64)
        
        # Extract data
        result = extractor.extract_car_leasing_data(pdf_data)
        
        if result['status'] == 'success':
            return {
                "success": True,
                "message": f"Successfully extracted data from {filename}",
                "data": result['data'],
                "metadata": {
                    **result['metadata'],
                    "filename": filename,
                    "file_size_bytes": len(pdf_data)
                }
            }
        else:
            return JSONResponse(
                status_code=422,
                content={
                    "success": False,
                    "message": "Failed to extract data from PDF",
                    "error": result['error'],
                    "filename": filename
                }
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing base64 PDF: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting OpenAI PDF Extractor API...")
    print("📖 API docs available at: http://localhost:8000/docs")
    print("🧪 Test endpoint at: http://localhost:8000/extract-pdf")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        reload=True
    )