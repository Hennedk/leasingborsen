# app.py - PDFPlumber POC service for Railway
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import traceback
import io

app = FastAPI()

# Add CORS middleware for testing from browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for POC
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "healthy", "service": "pdfplumber-poc", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/extract/structured")
async def extract_structured(file: UploadFile = File(...)):
    """Extract structured text from PDF for Railway integration"""
    try:
        # Read the uploaded PDF file
        content = await file.read()
        
        # Extract all text using pdfplumber
        extracted_text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                page_text = page.extract_text()
                if page_text:
                    extracted_text += f"\n--- Page {page_num} ---\n{page_text}\n"
        
        # Return the extracted text
        return JSONResponse(
            status_code=200,
            content={
                "extracted_text": extracted_text.strip(),
                "text": extracted_text.strip(),  # For backward compatibility
                "data": {
                    "extracted_text": extracted_text.strip(),
                    "text": extracted_text.strip()
                }
            }
        )
        
    except Exception as e:
        print(f"Error processing PDF: {str(e)}")
        print(traceback.format_exc())
        
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to extract text from PDF",
                "details": str(e)
            }
        )