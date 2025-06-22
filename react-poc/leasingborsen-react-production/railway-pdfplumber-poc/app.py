# app.py - Minimal POC service
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import traceback
import re
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
                # Extract tables with better settings
                tables = page.extract_tables({
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "text",
                    "snap_tolerance": 3,
                    "join_tolerance": 3,
                    "edge_min_length": 5
                })
                
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
                    # Debug: Store table info
                    table_info = {
                        "page": page_num + 1,
                        "table": table_idx + 1,
                        "rows": len(table) if table else 0,
                        "sample_rows": table[:3] if table else []
                    }
                    all_tables.append(table_info)
                    
                    if not table or len(table) < 2:
                        continue
                    
                    # Parse Toyota price table format with more flexible approach
                    for row_idx, row in enumerate(table):
                        if not row or all(cell is None or str(cell).strip() == "" for cell in row):
                            continue  # Skip empty rows
                            
                        try:
                            # Convert all cells to strings and clean
                            row_clean = [str(cell).strip() if cell is not None else "" for cell in row]
                            
                            # Look for any row with price indicators
                            has_price = any("kr" in str(cell).lower() for cell in row_clean if cell)
                            has_numbers = any(any(char.isdigit() for char in str(cell)) for cell in row_clean if cell)
                            
                            if not (has_price or has_numbers):
                                continue
                            
                            # Extract model/variant from first non-empty cell
                            model_text = ""
                            for cell in row_clean:
                                if cell and len(cell) > 1:
                                    model_text = cell
                                    break
                            
                            if not model_text:
                                continue
                            
                            # Try to identify Toyota models
                            model = "Toyota"  # Default
                            variant = model_text
                            
                            toyota_models = ["Yaris", "Corolla", "RAV4", "C-HR", "Camry", "Prius", "Aygo", "Highlander", "bZ4X"]
                            for tm in toyota_models:
                                if tm.lower() in model_text.lower():
                                    model = tm
                                    variant = model_text.replace(tm, "").strip()
                                    break
                            
                            item = {
                                "model": model,
                                "variant": variant,
                                "source": f"page_{page_num + 1}_table_{table_idx + 1}_row_{row_idx + 1}",
                                "raw_data": row_clean,
                                "prices": [],
                                "debug_info": {
                                    "has_price": has_price,
                                    "has_numbers": has_numbers,
                                    "original_row": row[:10]  # First 10 cells only
                                }
                            }
                            
                            # Extract prices from ALL columns with more flexible patterns
                            for col_idx, cell in enumerate(row_clean):
                                if not cell:
                                    continue
                                    
                                # Look for various price patterns
                                cell_lower = cell.lower()
                                
                                # Pattern 1: Contains "kr"
                                if "kr" in cell_lower:
                                    try:
                                        # Extract numeric part
                                        numbers = re.findall(r'\d{1,3}(?:[.,]\d{3})*', cell)
                                        for num_str in numbers:
                                            price = int(num_str.replace(".", "").replace(",", ""))
                                            if 1000 <= price <= 50000:
                                                item["prices"].append({
                                                    "column": col_idx,
                                                    "value": price,
                                                    "raw": cell,
                                                    "pattern": "kr_pattern"
                                                })
                                    except:
                                        pass
                                
                                # Pattern 2: Pure numbers that look like prices
                                elif re.match(r'^\d{1,2}[.,]?\d{3}$', cell):
                                    try:
                                        price = int(cell.replace(".", "").replace(",", ""))
                                        if 1000 <= price <= 50000:
                                            item["prices"].append({
                                                "column": col_idx,
                                                "value": price,
                                                "raw": cell,
                                                "pattern": "number_pattern"
                                            })
                                    except:
                                        pass
                            
                            # Add item even without prices for debugging
                            if item["prices"] or len(model_text) > 3:  # Either has prices OR meaningful text
                                items.append(item)
                                    
                        except Exception as e:
                            # Continue processing even if one row fails
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
                    extraction_result = {
                        "method": variation["name"],
                        "tables_found": len(tables),
                        "tables_detail": []
                    }
                    
                    # Show actual table content
                    for table_idx, table in enumerate(tables[:3]):  # First 3 tables
                        if table:
                            extraction_result["tables_detail"].append({
                                "table_index": table_idx,
                                "rows": len(table),
                                "columns": len(table[0]) if table else 0,
                                "first_5_rows": table[:5],
                                "has_kr_content": any("kr" in str(cell).lower() for row in table[:5] for cell in row if cell),
                                "has_numbers": any(any(char.isdigit() for char in str(cell)) for row in table[:5] for cell in row if cell)
                            })
                    
                    page_info["extractions"].append(extraction_result)
                
                # Sample text extraction
                text = page.extract_text()
                page_info["text_sample"] = text[:500] if text else None
                
                # Look for Toyota models in text
                toyota_models = ["Yaris", "Corolla", "RAV4", "C-HR", "Camry", "Prius", "Aygo"]
                found_models = [model for model in toyota_models if model.lower() in text.lower()]
                page_info["toyota_models_found"] = found_models
                
                # Look for price patterns in text
                price_patterns = re.findall(r'\d{1,3}[.,]?\d{3}\s*kr', text.lower()) if text else []
                page_info["price_patterns_found"] = price_patterns[:10]  # First 10
                
                debug_info["pages"].append(page_info)
            
            return JSONResponse(content=debug_info)
            
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "traceback": traceback.format_exc()}
        )

@app.post("/extract/table-content")
async def extract_table_content(file: UploadFile = File(...)):
    """Show actual table content for debugging"""
    try:
        content = await file.read()
        
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            all_tables_content = {
                "filename": file.filename,
                "total_pages": len(pdf.pages),
                "tables": []
            }
            
            for page_num, page in enumerate(pdf.pages):
                tables = page.extract_tables({
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "text",
                    "snap_tolerance": 3,
                    "join_tolerance": 3,
                    "edge_min_length": 5
                })
                
                for table_idx, table in enumerate(tables):
                    if table and len(table) > 1:
                        table_info = {
                            "page": page_num + 1,
                            "table_index": table_idx,
                            "rows": len(table),
                            "columns": len(table[0]) if table else 0,
                            "content": table[:10],  # First 10 rows
                            "analysis": {
                                "has_prices": any("kr" in str(cell).lower() for row in table for cell in row if cell),
                                "has_toyota_models": any(any(model.lower() in str(cell).lower() for model in ["Yaris", "Corolla", "RAV4", "C-HR"]) for row in table for cell in row if cell),
                                "numeric_cells": sum(1 for row in table for cell in row if cell and any(char.isdigit() for char in str(cell)))
                            }
                        }
                        all_tables_content["tables"].append(table_info)
            
            return JSONResponse(content=all_tables_content)
            
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