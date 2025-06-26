# app.py - PDFPlumber POC service with enhanced generic extraction
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import traceback
import re
import json
from typing import List, Dict, Any, Optional
import io
from extract_with_template import extract_with_template

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
    # Add version check to verify which code is running
    import inspect
    import importlib
    import extract_with_template
    importlib.reload(extract_with_template)
    from extract_with_template import generate_unique_variant_id
    
    try:
        # Check if our fix is present by looking at the function source
        source_lines = inspect.getsource(generate_unique_variant_id)
        has_early_return_fix = "EARLY RETURN" in source_lines
        has_variant_clean_fix = "variant_clean.endswith" in source_lines
        has_debug_print = "print(f" in source_lines
        
        return {
            "status": "healthy", 
            "service": "pdfplumber-poc", 
            "version": "1.0.0",
            "code_version": {
                "has_early_return_fix": has_early_return_fix,
                "has_variant_clean_fix": has_variant_clean_fix,
                "has_debug_print": has_debug_print,
                "extract_with_template_loaded": True
            }
        }
    except Exception as e:
        return {
            "status": "healthy", 
            "service": "pdfplumber-poc", 
            "version": "1.0.0",
            "code_version": {
                "error": str(e),
                "extract_with_template_loaded": False
            }
        }

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
    """Toyota-specific extraction with table parsing for accessories and cars"""
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
                
                for table_idx, table in enumerate(tables):
                    if not table or len(table) < 2:
                        continue
                    
                    # Parse table looking for ANY items with prices (accessories or cars)
                    for row_idx, row in enumerate(table):
                        if not row:
                            continue
                            
                        try:
                            # Convert all cells to strings and clean
                            row_clean = [str(cell).strip() if cell is not None else "" for cell in row]
                            
                            # Find prices in this row (kr./md. pattern)
                            price_cells = []
                            for col_idx, cell in enumerate(row_clean):
                                if "kr./md." in cell.lower() or "kr/md" in cell.lower():
                                    # Extract the price number
                                    price_match = re.search(r'(\d{1,4})\s*kr\.?/md\.?', cell.lower())
                                    if price_match:
                                        try:
                                            price = int(price_match.group(1))
                                            if 10 <= price <= 1000:  # Accessory price range
                                                price_cells.append({
                                                    "column": col_idx,
                                                    "value": price,
                                                    "raw": cell
                                                })
                                        except:
                                            pass
                            
                            # If we found prices, look for the item name in the same column or nearby
                            if price_cells:
                                for price_info in price_cells:
                                    col_idx = price_info["column"]
                                    
                                    # Look for item name in the same column, going upwards
                                    item_name = ""
                                    
                                    # Check current cell and cells above in same column
                                    for check_row in range(max(0, row_idx - 5), row_idx + 1):
                                        if check_row < len(table) and col_idx < len(table[check_row]):
                                            cell_content = str(table[check_row][col_idx]).strip()
                                            # Look for meaningful text (not price, not empty)
                                            if (cell_content and 
                                                len(cell_content) > 2 and 
                                                "kr" not in cell_content.lower() and
                                                not cell_content.isdigit()):
                                                item_name = cell_content
                                                break
                                    
                                    # If no name found in same column, check first column of current row
                                    if not item_name and len(row_clean) > 0:
                                        first_cell = row_clean[0]
                                        if (first_cell and 
                                            len(first_cell) > 2 and 
                                            "kr" not in first_cell.lower()):
                                            item_name = first_cell
                                    
                                    # Create item if we have a name
                                    if item_name:
                                        # Determine if this is a car model or accessory
                                        toyota_models = ["Yaris", "Corolla", "RAV4", "C-HR", "Camry", "Prius", "Aygo", "Highlander", "bZ4X"]
                                        is_car_model = any(model.lower() in item_name.lower() for model in toyota_models)
                                        
                                        if is_car_model:
                                            # It's a car model
                                            for model in toyota_models:
                                                if model.lower() in item_name.lower():
                                                    item = {
                                                        "type": "car_model",
                                                        "model": model,
                                                        "variant": item_name.replace(model, "").strip(),
                                                        "monthly_price": price_info["value"],
                                                        "source": f"page_{page_num + 1}_table_{table_idx + 1}_row_{row_idx + 1}",
                                                        "raw_price": price_info["raw"],
                                                        "category": "vehicle"
                                                    }
                                                    items.append(item)
                                                    break
                                        else:
                                            # It's an accessory/option
                                            item = {
                                                "type": "accessory",
                                                "model": "Toyota",
                                                "variant": item_name,
                                                "monthly_price": price_info["value"],
                                                "source": f"page_{page_num + 1}_table_{table_idx + 1}_row_{row_idx + 1}",
                                                "raw_price": price_info["raw"],
                                                "category": "accessory"
                                            }
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
            
            # Categorize items
            car_models = [item for item in items if item.get("type") == "car_model"]
            accessories = [item for item in items if item.get("type") == "accessory"]
            
            return JSONResponse(content={
                "success": True,
                "dealer": "toyota",
                "pdf_type": "accessories" if len(accessories) > len(car_models) else "car_models",
                "items_extracted": len(items),
                "car_models_found": len(car_models),
                "accessories_found": len(accessories),
                "tables_found": len(all_tables),
                "items": items[:50],  # Limit to first 50 items
                "summary": {
                    "car_models": car_models[:10],
                    "accessories": accessories[:10]
                }
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

@app.post("/extract/template")
async def extract_with_template_endpoint(file: UploadFile = File(...)):
    """Extract using enhanced Toyota variant extraction system"""
    try:
        content = await file.read()
        
        # Try enhanced extraction first
        try:
            from toyota_27_variant_extractor import Toyota27VariantExtractor
            import datetime
            
            # Get basic extraction first
            with open('toyota-template-config.json', 'r') as f:
                template_config = json.load(f)
            
            basic_result = extract_with_template(content, template_config)
            
            if basic_result.get("success") and basic_result.get("items"):
                # Apply enhanced processing to get exactly 27 variants
                extractor = Toyota27VariantExtractor()
                enhanced_items = extractor.process_to_27_variants(basic_result["items"])
                
                # Create validation and statistics
                validation = extractor.validate_extraction_results(enhanced_items)
                stats = extractor.get_statistics()
                
                # Enhanced result with exactly 27 variants
                enhanced_result = {
                    "success": True,
                    "items_extracted": len(enhanced_items),
                    "items": enhanced_items,
                    "metadata": {
                        "pages_processed": basic_result.get("metadata", {}).get("pages_processed", 0),
                        "raw_items_found": len(basic_result.get("items", [])),
                        "validated_items": len(enhanced_items),
                        "template_version": "Enhanced v2.1",
                        "extraction_method": "toyota_27_variant_extraction",
                        "extraction_timestamp": datetime.datetime.now().isoformat(),
                        "enhanced_features_active": True
                    },
                    "errors": [],
                    "variant_breakdown": validation.get("models", {}),
                    "validation": validation,
                    "extraction_stats": stats
                }
                
                return JSONResponse(content=enhanced_result)
            
        except ImportError as e:
            print(f"Enhanced extraction not available: {e}")
            # Fallback to basic template extraction
            pass
        except Exception as e:
            print(f"Enhanced extraction failed: {e}")
            # Fallback to basic template extraction
            pass
        
        # Fallback: Load Toyota template configuration for basic extraction
        with open('toyota-template-config.json', 'r') as f:
            template_config = json.load(f)
        
        # Extract using basic template
        result = extract_with_template(content, template_config)
        
        # Enhance result with car model specific info for basic extraction
        car_models = [item for item in result.get("items", []) if item.get("type") == "car_model"]
        accessories = [item for item in result.get("items", []) if item.get("type") == "accessory"]
        
        enhanced_result = {
            **result,
            "extraction_type": "car_models_and_variants",
            "car_models_found": len(car_models),
            "accessories_found": len(accessories),
            "metadata": {
                **result.get("metadata", {}),
                "template_version": "Basic v1.0",
                "extraction_method": "basic_template_extraction",
                "enhanced_features_active": False
            },
            "summary": {
                "models_by_type": {},
                "variants_found": [],
                "price_range": {"min": None, "max": None},
                "lease_terms_coverage": {}
            }
        }
        
        # Analyze extracted car models
        if car_models:
            # Group by model
            models_by_type = {}
            all_variants = []
            prices = []
            lease_terms = {"months": [], "mileage": [], "first_payment": []}
            
            for car in car_models:
                model = car.get("model", "Unknown")
                if model not in models_by_type:
                    models_by_type[model] = []
                models_by_type[model].append(car)
                
                if car.get("variant"):
                    all_variants.append(car["variant"])
                
                if car.get("monthly_price"):
                    prices.append(car["monthly_price"])
                
                if car.get("lease_months"):
                    lease_terms["months"].append(car["lease_months"])
                if car.get("mileage_per_year"):
                    lease_terms["mileage"].append(car["mileage_per_year"])
                if car.get("first_payment"):
                    lease_terms["first_payment"].append(car["first_payment"])
            
            enhanced_result["summary"]["models_by_type"] = {
                model: len(variants) for model, variants in models_by_type.items()
            }
            enhanced_result["summary"]["variants_found"] = list(set(all_variants))
            
            if prices:
                enhanced_result["summary"]["price_range"] = {
                    "min": min(prices),
                    "max": max(prices),
                    "average": round(sum(prices) / len(prices))
                }
            
            enhanced_result["summary"]["lease_terms_coverage"] = {
                "months_data": f"{len(lease_terms['months'])}/{len(car_models)} items",
                "mileage_data": f"{len(lease_terms['mileage'])}/{len(car_models)} items",
                "first_payment_data": f"{len(lease_terms['first_payment'])}/{len(car_models)} items"
            }
        
        return JSONResponse(content=enhanced_result)
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "traceback": traceback.format_exc()}
        )

@app.post("/extract/template-debug")
async def extract_template_debug(file: UploadFile = File(...)):
    """Debug template extraction with detailed logging"""
    try:
        content = await file.read()
        
        # Load Toyota template configuration
        with open('toyota-template-config.json', 'r') as f:
            template_config = json.load(f)
        
        # Enable all debugging
        template_config["debugging"] = {
            "log_table_structure": True,
            "log_text_extraction": True,
            "log_pattern_matches": True,
            "save_intermediate_results": True
        }
        
        # Extract using template
        result = extract_with_template(content, template_config)
        
        # Return everything including debug info
        return JSONResponse(content=result)
        
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

@app.post("/extract/structured")
async def extract_structured(
    file: UploadFile = File(...),
    profile: str = Form("generic"),
    custom_patterns: Optional[str] = Form(None)  # JSON string of patterns
):
    """
    Generic PDF extraction with profile-based processing
    
    Profiles:
    - generic: Basic text extraction with minimal cleaning
    - automotive: Toyota-specific extraction for car pricing
    - invoice: Invoice-specific extraction patterns
    """
    try:
        content = await file.read()
        
        # Parse custom patterns if provided
        custom_pattern_list = []
        if custom_patterns:
            try:
                custom_pattern_list = json.loads(custom_patterns)
            except:
                pass
        
        # Initialize generic extractor
        extractor = GenericPDFExtractor()
        
        # Profile-specific processing
        if profile == "automotive":
            # Use existing Toyota extraction logic
            return await extract_toyota(file)
            
        elif profile == "invoice":
            # Invoice-specific options
            options = {
                "clean_text": True,
                "extract_tables": True,
                "remove_headers_footers": True,
                "normalize_whitespace": True,
                "custom_patterns": custom_pattern_list + [
                    r"Invoice|Faktura|Rechnung",  # Invoice headers
                    r"VAT|MVA|Moms",  # Tax identifiers
                ]
            }
        else:
            # Generic options
            options = {
                "clean_text": True,
                "extract_tables": False,
                "remove_headers_footers": False,
                "normalize_whitespace": True,
                "custom_patterns": custom_pattern_list
            }
        
        # Extract with profile options
        result = extractor.extract_text(content, options)
        
        # Add structure detection
        if result["text"]:
            structure = detect_document_structure(result["text"])
            result["structure"] = structure
        
        # Standardized response format
        response = {
            "success": True,
            "data": result,
            "profile": profile,
            "filename": file.filename
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "profile": profile,
                "filename": file.filename if file else None
            }
        )

# Generic PDF Extraction Classes
class GenericPDFExtractor:
    """Generic PDF text extractor with configurable cleaning"""
    
    def __init__(self):
        # Generic noise patterns that apply to most business PDFs
        self.noise_patterns = [
            r'Page \d+ of \d+|Side \d+ af \d+',  # Page numbers
            r'\[PAGE \d+\]',  # Page markers
            r'©.*?\d{4}',  # Copyright notices
            r'www\.\S+|https?://\S+',  # URLs
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Emails
        ]
    
    def extract_text(self, pdf_bytes: bytes, options: Dict[str, Any] = None) -> Dict[str, Any]:
        """Extract text from PDF with various options"""
        options = options or {}
        
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            result = {
                "text": "",
                "pages": [],
                "tables": [],
                "metadata": {
                    "page_count": len(pdf.pages),
                    "has_tables": False,
                    "extraction_method": "pdfplumber"
                }
            }
            
            for i, page in enumerate(pdf.pages):
                page_data = {"page_number": i + 1}
                
                # Extract text
                text = page.extract_text()
                if text:
                    # Apply cleaning if requested
                    if options.get("clean_text", True):
                        text = self._clean_text(text, options.get("custom_patterns", []))
                    
                    page_data["text"] = text
                    result["text"] += text + "\n\n"
                
                # Extract tables if requested
                if options.get("extract_tables", False):
                    tables = page.extract_tables()
                    if tables:
                        page_data["tables"] = tables
                        result["tables"].extend(tables)
                        result["metadata"]["has_tables"] = True
                
                result["pages"].append(page_data)
            
            # Additional processing
            if options.get("remove_headers_footers", False):
                result["text"] = self._remove_headers_footers(result["text"])
            
            if options.get("normalize_whitespace", True):
                result["text"] = self._normalize_whitespace(result["text"])
            
            return result
    
    def _clean_text(self, text: str, custom_patterns: List[str] = None) -> str:
        """Apply generic cleaning patterns"""
        # Apply built-in noise patterns
        for pattern in self.noise_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Apply custom patterns if provided
        if custom_patterns:
            for pattern in custom_patterns:
                text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE)
        
        return text
    
    def _remove_headers_footers(self, text: str) -> str:
        """Remove common header/footer patterns"""
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # Skip lines that look like headers/footers
            if not any([
                re.match(r'^\d+$', line.strip()),  # Just page numbers
                len(line.strip()) < 5,  # Very short lines
                re.match(r'^(CONFIDENTIAL|INTERNAL|DRAFT)', line, re.I),
            ]):
                cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def _normalize_whitespace(self, text: str) -> str:
        """Normalize whitespace"""
        # Remove excessive newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Remove excessive spaces
        text = re.sub(r' {2,}', ' ', text)
        # Remove trailing whitespace
        text = '\n'.join(line.rstrip() for line in text.split('\n'))
        return text.strip()

def detect_document_structure(text: str) -> Dict[str, Any]:
    """Detect common document structures"""
    structure = {
        "has_tables": bool(re.search(r'\d+\s+\d+\s+\d+', text)),
        "has_prices": bool(re.search(r'\d{1,3}[.,]\d{3}', text)),
        "has_dates": bool(re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', text)),
        "sections": [],
        "document_type": "unknown"
    }
    
    # Detect document type
    if re.search(r'(invoice|faktura|rechnung)', text, re.I):
        structure["document_type"] = "invoice"
    elif re.search(r'(price list|prisliste|prijslijst)', text, re.I):
        structure["document_type"] = "price_list"
    elif re.search(r'(contract|kontrakt|aftale)', text, re.I):
        structure["document_type"] = "contract"
    elif re.search(r'(toyota|volkswagen|bmw|audi|mercedes)', text, re.I):
        structure["document_type"] = "automotive"
    
    # Find section headers (lines in all caps or followed by many dashes/equals)
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if line.isupper() and len(line) > 5 and len(line) < 50:
            structure["sections"].append({
                "title": line.strip(),
                "line_number": i
            })
    
    return structure

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