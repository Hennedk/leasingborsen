# app.py - Minimal PDFPlumber service for Railway deployment
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import traceback
import io
import os

app = FastAPI(
    title="PDF Extraction Service",
    description="FastAPI service for extracting text from PDF files",
    version="1.1.0"
)

# Add CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "healthy", "service": "pdfplumber-poc", "version": "1.1.0"}

@app.get("/health")
def health():
    return {"status": "ok", "service": "pdf-extraction"}

@app.post("/extract/structured")
async def extract_structured(file: UploadFile = File(...)):
    """Extract structured text from PDF for AI processing"""
    try:
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are supported"
            )

        # Read the uploaded PDF file
        content = await file.read()
        
        # Extract text using pdfplumber
        extracted_text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                page_text = page.extract_text()
                if page_text:
                    extracted_text += f"\n--- Page {page_num} ---\n{page_text}\n"
        
        # Clean up the text
        extracted_text = extracted_text.strip()
        
        if not extracted_text:
            raise HTTPException(
                status_code=400,
                detail="No text could be extracted from the PDF"
            )
        
        return JSONResponse(
            status_code=200,
            content={
                "extracted_text": extracted_text,
                "pages_processed": len(pdf.pages),
                "text_length": len(extracted_text),
                "status": "success"
            }
        )
        
    except Exception as e:
        error_msg = str(e)
        print(f"Error extracting PDF: {error_msg}")
        print(traceback.format_exc())
        
        return JSONResponse(
            status_code=500,
            content={
                "error": "PDF processing failed",
                "details": error_msg
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)