# app.py - Minimal POC service
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import traceback
from typing import List, Dict, Any
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

@app.post("/extract/basic")
async def extract_basic(file: UploadFile = File(...)):
    """Basic extraction - all tables and text"""
    try:
        content = await file.read()
        
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            result = {
                "filename": file.filename,
                "pages": len(pdf.pages),
                "metadata": pdf.metadata,
                "extraction": {
                    "tables": [],
                    "text": [],
                    "pages_detail": []
                }
            }
            
            # Extract from each page
            for i, page in enumerate(pdf.pages):
                # Extract tables
                tables = page.extract_tables()
                
                # Extract text (with layout)
                text = page.extract_text()
                text_simple = page.extract_text_simple()
                
                page_data = {
                    "page_number": i + 1,
                    "tables_count": len(tables),
                    "tables": tables,
                    "text": text[:1000] if text else None,  # First 1000 chars
                    "text_simple": text_simple[:1000] if text_simple else None,
                    "width": page.width,
                    "height": page.height
                }
                
                result["extraction"]["pages_detail"].append(page_data)
                result["extraction"]["tables"].extend(tables)
                if text:
                    result["extraction"]["text"].append(text)
            
            return JSONResponse(content=result)
            
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "traceback": traceback.format_exc()}
        )

@app.post("/extract/toyota")
async def extract_toyota(file: UploadFile = File(...)):
    """Toyota-specific extraction with table parsing"""
    try:
        content = await file.read()
        
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            items = []
            all_tables = []
            
            for page_num, page in enumerate(pdf.pages):
                # Try different table extraction strategies
                tables = page.extract_tables({
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "text",
                    "snap_tolerance": 3,
                    "join_tolerance": 3,
                    "edge_min_length": 5
                })
                
                all_tables.extend(tables)
                
                for table_idx, table in enumerate(tables):
                    # Parse Toyota price table format
                    for row_idx, row in enumerate(table):
                        if row_idx == 0:  # Skip header row
                            continue
                            
                        if len(row) >= 3 and row[0]:  # Has enough columns
                            try:
                                # Clean and extract data
                                model_variant = clean_text(row[0])
                                
                                # Try to split model and variant
                                model = "Toyota"  # Default
                                variant = model_variant
                                
                                # Look for known Toyota models
                                toyota_models = ["Yaris", "Corolla", "RAV4", "C-HR", "Camry", "Prius", "Aygo"]
                                for tm in toyota_models:
                                    if tm.lower() in model_variant.lower():
                                        model = tm
                                        variant = model_variant.replace(tm, "").strip()
                                        break
                                
                                item = {
                                    "model": model,
                                    "variant": variant,
                                    "source": f"page_{page_num + 1}_table_{table_idx + 1}_row_{row_idx + 1}",
                                    "raw_data": row,
                                    "prices": []
                                }
                                
                                # Extract prices from remaining columns
                                for col_idx, cell in enumerate(row[1:], 1):
                                    if cell and isinstance(cell, str):
                                        # Look for price patterns
                                        cell_clean = cell.replace(" ", "").replace(".", "")
                                        if "kr" in cell_clean.lower():
                                            try:
                                                # Extract numeric value
                                                price_str = cell_clean.lower().replace("kr", "").strip()
                                                price = int(price_str)
                                                
                                                if 1000 < price < 50000:  # Reasonable price range
                                                    item["prices"].append({
                                                        "column": col_idx,
                                                        "value": price,
                                                        "raw": cell
                                                    })
                                            except:
                                                pass
                                
                                # Only add items with prices
                                if item["prices"]:
                                    items.append(item)
                                    
                            except Exception as e:
                                continue
                
                # Also try text-based extraction as fallback
                text = page.extract_text()
                if text and len(items) < 5:  # If few items found via tables
                    lines = text.split('\n')
                    for line in lines:
                        if 'kr' in line.lower() and any(m in line for m in ["Yaris", "Corolla", "RAV4"]):
                            # Try to extract from text line
                            parts = line.split()
                            for i, part in enumerate(parts):
                                if 'kr' in part.lower():
                                    try:
                                        price_str = part.replace('kr', '').replace('.', '').strip()
                                        price = int(price_str)
                                        if 1000 < price < 50000:
                                            items.append({
                                                "model": "Toyota",
                                                "variant": "Text extraction",
                                                "source": f"page_{page_num + 1}_text",
                                                "raw_data": line[:100],
                                                "prices": [{"value": price, "raw": part}]
                                            })
                                    except:
                                        pass
            
            return JSONResponse(content={
                "success": True,
                "dealer": "toyota",
                "items_extracted": len(items),
                "tables_found": len(all_tables),
                "items": items[:50]  # Limit to first 50 items
            })
            
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "traceback": traceback.format_exc()}
        )

@app.post("/extract/debug")
async def extract_debug(file: UploadFile = File(...)):
    """Debug extraction - shows all detected elements"""
    try:
        content = await file.read()
        
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            debug_info = {
                "filename": file.filename,
                "total_pages": len(pdf.pages),
                "pages": []
            }
            
            # Only process first 2 pages for debug
            for i, page in enumerate(pdf.pages[:2]):
                # Extract with different settings
                settings_variations = [
                    {"name": "default", "settings": {}},
                    {"name": "lines_strict", "settings": {
                        "vertical_strategy": "lines_strict",
                        "horizontal_strategy": "lines_strict"
                    }},
                    {"name": "text_based", "settings": {
                        "vertical_strategy": "text",
                        "horizontal_strategy": "text"
                    }},
                    {"name": "mixed", "settings": {
                        "vertical_strategy": "lines",
                        "horizontal_strategy": "text",
                        "snap_tolerance": 3
                    }}
                ]
                
                page_info = {
                    "page_number": i + 1,
                    "width": page.width,
                    "height": page.height,
                    "extractions": []
                }
                
                for variation in settings_variations:
                    tables = page.extract_tables(variation["settings"])
                    page_info["extractions"].append({
                        "method": variation["name"],
                        "tables_found": len(tables),
                        "first_table_sample": tables[0][:5] if tables else None  # First 5 rows
                    })
                
                # Sample text extraction
                text = page.extract_text()
                page_info["text_sample"] = text[:500] if text else None
                
                # Words for debugging
                words = page.extract_words()
                page_info["words_sample"] = words[:20] if words else []
                
                debug_info["pages"].append(page_info)
            
            return JSONResponse(content=debug_info)
            
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "traceback": traceback.format_exc()}
        )

# Helper functions
def clean_text(text: str) -> str:
    if not text:
        return ""
    return text.strip().replace("\n", " ").replace("  ", " ")

def parse_toyota_row(row: List[str]) -> Dict[str, Any]:
    # Parse Toyota-specific row format
    details = {}
    for i, cell in enumerate(row):
        if cell and any(keyword in str(cell).lower() for keyword in ["km", "mdr", "kr"]):
            details[f"col_{i}"] = cell
    return details

def extract_prices_from_row(cells: List[str]) -> List[Dict[str, Any]]:
    prices = []
    for cell in cells:
        if cell and "kr" in str(cell).lower():
            try:
                # Extract price value
                price_str = cell.replace("kr", "").replace(".", "").strip()
                price = int(price_str)
                if 1000 < price < 50000:  # Reasonable price range
                    prices.append({"value": price, "raw": cell})
            except:
                continue
    return prices

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)