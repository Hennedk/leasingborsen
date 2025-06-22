# extract_with_template.py - Advanced Toyota PDF extraction for Danish leasing documents

import pdfplumber
import re
import json
import io
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ExtractionResult:
    success: bool
    items: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    errors: List[str]
    debug_info: Optional[Dict[str, Any]] = None

class ToyotaDanishExtractor:
    def __init__(self, template_config: Dict[str, Any]):
        self.config = template_config
        self.extraction_rules = template_config["extraction_rules"]
        self.validation_rules = template_config["validation_rules"]
        self.pdfplumber_config = template_config["pdfplumber_config"]
        self.debug = template_config.get("debugging", {})
        
        # Initialize debugging info if enabled
        self.debug_info = {
            "pages_processed": [],
            "tables_found": [],
            "text_extraction_samples": [],
            "pattern_matches": [],
            "extraction_stages": []
        } if self.debug.get("save_intermediate_results", False) else None
    
    def extract_from_pdf(self, pdf_content: bytes) -> ExtractionResult:
        """Extract Toyota car models from Danish leasing PDF"""
        items = []
        errors = []
        
        try:
            # Convert bytes to file-like object for PDFPlumber
            pdf_file = io.BytesIO(pdf_content)
            with pdfplumber.open(pdf_file) as pdf:
                self._log_debug("extraction_stages", f"Starting extraction from {len(pdf.pages)} pages")
                
                # Extract document metadata
                document_info = self._extract_document_info(pdf.pages[0] if pdf.pages else None)
                
                # Process each page for models and pricing
                for page_num, page in enumerate(pdf.pages):
                    self._log_debug("pages_processed", f"Processing page {page_num + 1}")
                    
                    # Extract models from this page
                    page_items = self._extract_models_from_page(page, page_num + 1)
                    items.extend(page_items)
                    
                    # Debug: log text sample
                    if self.debug.get("log_text_extraction", False):
                        text_sample = page.extract_text()[:500] if page.extract_text() else ""
                        self._log_debug("text_extraction_samples", {
                            "page": page_num + 1,
                            "sample": text_sample,
                            "has_toyota_models": any(model in text_sample.upper() for model in self.extraction_rules["toyota_models"])
                        })
                
                # Post-processing
                items = self._post_process_items(items)
                
                # Validation
                validated_items = []
                for item in items:
                    validation_result = self._validate_item(item)
                    if validation_result["valid"]:
                        validated_items.append(item)
                    else:
                        errors.extend(validation_result["errors"])
                
                self._log_debug("extraction_stages", f"Validation complete: {len(validated_items)} valid items from {len(items)} extracted")
                
                return ExtractionResult(
                    success=True,
                    items=validated_items,
                    metadata={
                        "pages_processed": len(pdf.pages),
                        "raw_items_found": len(items),
                        "validated_items": len(validated_items),
                        "template_version": self.config["version"],
                        "extraction_method": "toyota_danish_structured",
                        "document_info": document_info,
                        "extraction_timestamp": datetime.utcnow().isoformat() + "Z"
                    },
                    errors=errors,
                    debug_info=self.debug_info
                )
                
        except Exception as e:
            import traceback
            error_details = f"Extraction failed: {str(e)}"
            traceback_str = traceback.format_exc()
            
            self._log_debug("extraction_stages", f"ERROR: {error_details}")
            self._log_debug("extraction_stages", f"TRACEBACK: {traceback_str}")
            
            return ExtractionResult(
                success=False,
                items=[],
                metadata={"error_type": type(e).__name__},
                errors=[error_details, f"Traceback: {traceback_str}"],
                debug_info=self.debug_info
            )
    
    def _extract_document_info(self, first_page) -> Dict[str, Any]:
        """Extract document metadata from first page"""
        if not first_page:
            return {}
        
        text = first_page.extract_text() or ""
        doc_patterns = self.extraction_rules.get("document_patterns", {})
        
        # Extract brand
        brand = "Toyota"
        if doc_patterns.get("brand_detection") in text:
            brand = doc_patterns["brand_detection"]
        
        # Extract date (Danish format: "27. MAJ 2025")
        document_date = None
        if "date_pattern" in doc_patterns:
            date_match = re.search(doc_patterns["date_pattern"], text)
            if date_match:
                day, month_da, year = date_match.groups()
                document_date = self._parse_danish_date(day, month_da, year)
        
        return {
            "brand": brand,
            "document_date": document_date,
            "currency": "DKK",
            "language": "da",
            "document_type": "private_leasing"
        }
    
    def _extract_models_from_page(self, page, page_num: int) -> List[Dict[str, Any]]:
        """Extract car models and variants from a single page"""
        items = []
        
        # Extract text for model detection
        text = page.extract_text() or ""
        
        # Find model headers
        current_model = self._detect_model_on_page(text)
        if not current_model:
            self._log_debug("extraction_stages", f"No Toyota model detected on page {page_num}")
            return items
        
        self._log_debug("extraction_stages", f"Detected model '{current_model}' on page {page_num}")
        
        # Extract tables with enhanced settings
        tables = page.extract_tables(self.pdfplumber_config["table_settings"])
        
        if self.debug.get("log_table_structure", False):
            self._log_debug("tables_found", {
                "page": page_num,
                "tables_count": len(tables),
                "table_sizes": [(len(t), len(t[0]) if t and t[0] else 0) for t in tables if t]
            })
        
        # Process each table looking for pricing data
        for table_idx, table in enumerate(tables):
            if not table or len(table) < 2:
                continue
            
            # Check if this is a pricing table
            if self._is_pricing_table(table):
                self._log_debug("extraction_stages", f"Found pricing table on page {page_num}, table {table_idx}")
                
                # Extract variants from pricing table
                table_items = self._extract_variants_from_pricing_table(
                    table, current_model, page_num, table_idx
                )
                items.extend(table_items)
        
        return items
    
    def _detect_model_on_page(self, text: str) -> Optional[str]:
        """Detect Toyota model from page text"""
        toyota_models = self.extraction_rules["toyota_models"]
        
        # Check for model header pattern first
        doc_patterns = self.extraction_rules.get("document_patterns", {})
        if "model_header_pattern" in doc_patterns:
            header_match = re.search(doc_patterns["model_header_pattern"], text, re.MULTILINE)
            if header_match:
                detected_model = header_match.group(1).strip()
                # Verify it's a known Toyota model
                for model in toyota_models:
                    if model.upper() in detected_model.upper():
                        return model
        
        # Fallback: look for any Toyota model mention
        text_upper = text.upper()
        for model in toyota_models:
            if model.upper() in text_upper:
                return model
        
        return None
    
    def _is_pricing_table(self, table: List[List[str]]) -> bool:
        """Check if table contains pricing information"""
        if not table or len(table) < 2:
            return False
        
        # Check headers for pricing keywords
        headers = table[0]
        if not headers:
            return False
        
        header_text = " ".join(str(cell or "") for cell in headers).lower()
        
        pricing_detection = self.extraction_rules.get("pricing_table_detection", {})
        header_keywords = pricing_detection.get("header_keywords", [])
        
        # Must contain at least one pricing keyword
        keyword_found = any(keyword.lower() in header_text for keyword in header_keywords)
        
        # Check data rows for price patterns
        price_found = False
        for row in table[1:3]:  # Check first few data rows
            if any(self._contains_price_pattern(str(cell or "")) for cell in row):
                price_found = True
                break
        
        return keyword_found and price_found
    
    def _contains_price_pattern(self, text: str) -> bool:
        """Check if text contains a Danish price pattern"""
        price_patterns = self.extraction_rules.get("price_patterns", [])
        
        for pattern_config in price_patterns:
            if re.search(pattern_config["pattern"], text):
                return True
        return False
    
    def _extract_variants_from_pricing_table(self, table: List[List[str]], model: str, page_num: int, table_idx: int) -> List[Dict[str, Any]]:
        """Extract car variants from a pricing table"""
        items = []
        
        if not table or len(table) < 2:
            return items
        
        headers = table[0]
        data_rows = table[1:]
        
        # Find column indices
        variant_col = self._find_column_index(headers, ["variant", "model", "type"])
        monthly_col = self._find_column_index(headers, ["ydelse", "monthly", "md", "månedlig"])
        first_payment_col = self._find_column_index(headers, ["førstegangs", "first", "udbetaling"])
        total_col = self._find_column_index(headers, ["total", "totalpris"])
        km_col = self._find_column_index(headers, ["km/l", "forbrug", "consumption"])
        annual_km_col = self._find_column_index(headers, ["kilometer", "km", "år", "årlig"])
        
        self._log_debug("extraction_stages", f"Column mapping: variant={variant_col}, monthly={monthly_col}, first_payment={first_payment_col}")
        
        # Extract each data row
        for row_idx, row in enumerate(data_rows):
            if not row or all(not cell for cell in row):
                continue
            
            # Extract variant name
            variant_name = self._extract_variant_name(row, variant_col)
            if not variant_name:
                continue
            
            # Extract monthly price (required)
            monthly_price = self._extract_danish_price(row, monthly_col)
            if not monthly_price:
                continue
            
            # Build car variant object
            item = {
                "type": "car_model",
                "make": "Toyota",
                "model": model,
                "variant": variant_name,
                "monthly_price": monthly_price,
                "currency": "DKK",
                "source": {
                    "page": page_num,
                    "table": table_idx,
                    "row": row_idx + 1,  # +1 because we skip header
                    "extraction_method": "pricing_table"
                },
                "confidence": 0.8
            }
            
            # Extract optional fields
            first_payment = self._extract_danish_price(row, first_payment_col)
            if first_payment:
                item["first_payment"] = first_payment
                item["confidence"] += 0.1
            
            total_cost = self._extract_danish_price(row, total_col)
            if total_cost:
                item["total_cost"] = total_cost
            
            # Extract fuel consumption or efficiency
            fuel_consumption = self._extract_fuel_consumption(row, km_col)
            if fuel_consumption:
                item["fuel_consumption_kmpl"] = fuel_consumption
            
            # Extract annual kilometers
            annual_km = self._extract_annual_kilometers(row, annual_km_col)
            if annual_km:
                item["annual_kilometers"] = annual_km
            
            # Extract engine specification from text patterns
            engine_spec = self._extract_engine_specification(row)
            if engine_spec:
                item["engine_specification"] = engine_spec["specification"]
                item["powertrain_type"] = engine_spec["type"]
            
            items.append(item)
            
            self._log_debug("pattern_matches", {
                "model": model,
                "variant": variant_name,
                "monthly_price": monthly_price,
                "row_data": [str(cell) for cell in row if cell]
            })
        
        return items
    
    def _find_column_index(self, headers: List[str], keywords: List[str]) -> int:
        """Find column index by matching keywords in headers"""
        for i, header in enumerate(headers):
            if not header:
                continue
            header_lower = str(header).lower()
            for keyword in keywords:
                if keyword.lower() in header_lower:
                    return i
        return -1
    
    def _extract_variant_name(self, row: List[str], variant_col: int) -> Optional[str]:
        """Extract variant name from table row"""
        if variant_col >= 0 and variant_col < len(row) and row[variant_col]:
            variant_text = str(row[variant_col]).strip()
            
            # Use variant patterns to clean up the text
            variant_patterns = self.extraction_rules.get("variant_patterns", [])
            for pattern_config in variant_patterns:
                match = re.search(pattern_config["pattern"], variant_text)
                if match:
                    return match.group(1).strip()
            
            # Fallback: return cleaned text if it looks like a variant
            if len(variant_text) >= 2 and not variant_text.isdigit():
                return variant_text
        
        # Try to find variant in other columns
        for i, cell in enumerate(row):
            if not cell or i == variant_col:
                continue
            cell_str = str(cell).strip()
            if self._looks_like_variant(cell_str):
                return cell_str
        
        return None
    
    def _looks_like_variant(self, text: str) -> bool:
        """Check if text looks like a variant name"""
        if len(text) < 2 or len(text) > 50:
            return False
        
        # Check against common variants
        common_variants = self.validation_rules.get("variant_validation", {}).get("common_variants", [])
        for variant in common_variants:
            if variant.lower() in text.lower():
                return True
        
        # Check if it contains variant-like words
        variant_words = ["active", "style", "comfort", "executive", "premium", "hybrid", "electric"]
        text_lower = text.lower()
        return any(word in text_lower for word in variant_words)
    
    def _extract_danish_price(self, row: List[str], col_idx: int) -> Optional[int]:
        """Extract price in Danish format from table row"""
        if col_idx < 0:
            return None
        
        # Check the specified column first
        if col_idx < len(row) and row[col_idx]:
            price = self._parse_danish_price(str(row[col_idx]))
            if price:
                return price
        
        # Search other columns for price patterns
        for cell in row:
            if cell:
                price = self._parse_danish_price(str(cell))
                if price:
                    return price
        
        return None
    
    def _parse_danish_price(self, text: str) -> Optional[int]:
        """Parse Danish price format (e.g., '2.699' or '2,699')"""
        price_patterns = self.extraction_rules.get("price_patterns", [])
        
        for pattern_config in price_patterns:
            pattern = pattern_config["pattern"]
            matches = re.finditer(pattern, text)
            
            for match in matches:
                try:
                    if pattern_config.get("format") == "danish_thousands":
                        # Format like "2.699" or "2,699"
                        thousands = match.group(1)
                        hundreds = match.group(2)
                        price = int(thousands) * 1000 + int(hundreds)
                    else:
                        # Simple format
                        price = int(match.group(1))
                    
                    # Validate price range
                    min_val = pattern_config.get("min_value", 0)
                    max_val = pattern_config.get("max_value", 999999)
                    
                    if min_val <= price <= max_val:
                        return price
                        
                except (ValueError, IndexError):
                    continue
        
        return None
    
    def _extract_fuel_consumption(self, row: List[str], col_idx: int) -> Optional[float]:
        """Extract fuel consumption (km/l)"""
        spec_patterns = self.extraction_rules.get("specification_patterns", {})
        fuel_pattern = spec_patterns.get("fuel_consumption")
        
        if not fuel_pattern:
            return None
        
        # Check specified column first
        if col_idx >= 0 and col_idx < len(row) and row[col_idx]:
            match = re.search(fuel_pattern, str(row[col_idx]))
            if match:
                try:
                    return float(match.group(1).replace(",", "."))
                except ValueError:
                    pass
        
        # Search all columns
        for cell in row:
            if cell:
                match = re.search(fuel_pattern, str(cell))
                if match:
                    try:
                        return float(match.group(1).replace(",", "."))
                    except ValueError:
                        pass
        
        return None
    
    def _extract_annual_kilometers(self, row: List[str], col_idx: int) -> Optional[int]:
        """Extract annual kilometers"""
        spec_patterns = self.extraction_rules.get("specification_patterns", {})
        km_pattern = spec_patterns.get("annual_kilometers")
        
        if not km_pattern:
            return None
        
        # Check specified column first
        if col_idx >= 0 and col_idx < len(row) and row[col_idx]:
            match = re.search(km_pattern, str(row[col_idx]))
            if match:
                try:
                    km_text = match.group(1).replace(".", "").replace(",", "")
                    return int(km_text)
                except ValueError:
                    pass
        
        # Search all columns
        for cell in row:
            if cell:
                match = re.search(km_pattern, str(cell))
                if match:
                    try:
                        km_text = match.group(1).replace(".", "").replace(",", "")
                        return int(km_text)
                    except ValueError:
                        pass
        
        return None
    
    def _extract_engine_specification(self, row: List[str]) -> Optional[Dict[str, Any]]:
        """Extract engine specification from row"""
        engine_patterns = self.extraction_rules.get("engine_patterns", [])
        
        # Combine all cell text to search for engine specs
        row_text = " ".join(str(cell or "") for cell in row)
        
        for pattern_config in engine_patterns:
            pattern = pattern_config["pattern"]
            match = re.search(pattern, row_text)
            
            if match:
                engine_type = pattern_config["type"]
                
                if engine_type == "gasoline":
                    displacement = match.group(1)
                    power = match.group(2)
                    return {
                        "specification": f"{displacement} benzin {power} hk",
                        "type": "gasoline",
                        "displacement_l": float(displacement),
                        "power_hp": int(power)
                    }
                elif engine_type == "hybrid":
                    displacement = match.group(1)
                    power = match.group(2)
                    return {
                        "specification": f"{displacement} Hybrid {power} hk",
                        "type": "hybrid",
                        "displacement_l": float(displacement),
                        "power_hp": int(power)
                    }
                elif engine_type == "electric":
                    battery = match.group(1)
                    power = match.group(2)
                    return {
                        "specification": f"{battery} kWh {power} hk",
                        "type": "electric",
                        "battery_capacity_kwh": float(battery.replace(",", ".")),
                        "power_hp": int(power)
                    }
        
        return None
    
    def _parse_danish_date(self, day: str, month_da: str, year: str) -> Optional[str]:
        """Convert Danish date to ISO format"""
        month_map = {
            'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
            'MAJ': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
            'SEP': '09', 'OKT': '10', 'NOV': '11', 'DEC': '12'
        }
        
        month_num = month_map.get(month_da.upper())
        if month_num:
            try:
                return f"{year}-{month_num}-{day.zfill(2)}"
            except:
                pass
        return None
    
    def _post_process_items(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Post-process extracted items"""
        processed_items = []
        
        for item in items:
            # Apply standardization
            item = self._standardize_model_name(item)
            item = self._standardize_variant_name(item)
            item = self._normalize_prices(item)
            item = self._enrich_data(item)
            
            processed_items.append(item)
        
        # Remove duplicates
        return self._remove_duplicates(processed_items)
    
    def _standardize_model_name(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Standardize model names"""
        post_processing = self.config.get("post_processing", {})
        model_config = post_processing.get("model_standardization", {})
        
        if "model" in item:
            model = item["model"]
            
            # Normalize case
            if model_config.get("normalize_case") == "UPPER":
                model = model.upper()
            
            # Remove extra spaces
            if model_config.get("remove_extra_spaces"):
                model = re.sub(r'\\s+', ' ', model).strip()
            
            # Apply standard mappings
            standard_names = model_config.get("standardize_names", {})
            if model in standard_names:
                model = standard_names[model]
            
            item["model"] = model
        
        return item
    
    def _standardize_variant_name(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Standardize variant names"""
        post_processing = self.config.get("post_processing", {})
        variant_config = post_processing.get("variant_standardization", {})
        
        if "variant" in item:
            variant = item["variant"]
            
            # Normalize case
            if variant_config.get("normalize_case") == "Title":
                variant = variant.title()
            
            # Apply mappings
            mappings = variant_config.get("common_mappings", {})
            for abbrev, full_name in mappings.items():
                if abbrev.lower() in variant.lower():
                    variant = variant.replace(abbrev, full_name)
            
            item["variant"] = variant
        
        return item
    
    def _normalize_prices(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize price values"""
        post_processing = self.config.get("post_processing", {})
        price_config = post_processing.get("price_normalization", {})
        
        if price_config.get("ensure_integer"):
            for field in ["monthly_price", "first_payment", "total_cost"]:
                if field in item:
                    item[field] = int(item[field])
        
        return item
    
    def _enrich_data(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich item with additional data"""
        post_processing = self.config.get("post_processing", {})
        enrichment = post_processing.get("data_enrichment", {})
        
        if enrichment.get("add_currency"):
            item["currency"] = enrichment["add_currency"]
        
        if enrichment.get("add_market"):
            item["market"] = enrichment["add_market"]
        
        if enrichment.get("add_extraction_timestamp"):
            item["extracted_at"] = datetime.utcnow().isoformat() + "Z"
        
        return item
    
    def _remove_duplicates(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate items"""
        post_processing = self.config.get("post_processing", {})
        duplicate_config = post_processing.get("duplicate_removal", {})
        match_fields = duplicate_config.get("match_fields", ["model", "variant", "monthly_price"])
        
        seen = set()
        unique_items = []
        
        for item in items:
            # Create key for duplicate detection
            key_parts = []
            for field in match_fields:
                if field in item:
                    value = item[field]
                    if isinstance(value, str):
                        value = value.lower().strip()
                    key_parts.append(str(value))
            
            key = tuple(key_parts)
            
            if key not in seen:
                seen.add(key)
                unique_items.append(item)
        
        return unique_items
    
    def _validate_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Validate extracted item"""
        errors = []
        
        # Check required fields
        required_fields = self.validation_rules.get("required_fields", [])
        for field in required_fields:
            if field not in item or not item[field]:
                errors.append(f"Missing required field: {field}")
        
        # Validate prices
        if "price_validation" in self.validation_rules:
            price_val = self.validation_rules["price_validation"]
            
            monthly_price = item.get("monthly_price", 0)
            if not (price_val["monthly_min"] <= monthly_price <= price_val["monthly_max"]):
                errors.append(f"Monthly price {monthly_price} outside valid range")
            
            if "first_payment" in item:
                first_payment = item["first_payment"]
                if not (price_val["first_payment_min"] <= first_payment <= price_val["first_payment_max"]):
                    errors.append(f"First payment {first_payment} outside valid range")
        
        # Validate model
        if "model_validation" in self.validation_rules:
            model_val = self.validation_rules["model_validation"]
            model = item.get("model", "")
            
            if model_val.get("must_match_toyota_models", False):
                toyota_models = self.extraction_rules.get("toyota_models", [])
                if model not in toyota_models:
                    errors.append(f"Model {model} not in approved Toyota models")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    def _log_debug(self, category: str, info: Any):
        """Log debug information if debugging is enabled"""
        if self.debug_info and category in self.debug_info:
            self.debug_info[category].append(info)

# Helper function for API integration
def extract_with_template(pdf_content: bytes, template_config: Dict[str, Any]) -> Dict[str, Any]:
    """Main function for Toyota Danish template-based extraction"""
    extractor = ToyotaDanishExtractor(template_config)
    result = extractor.extract_from_pdf(pdf_content)
    
    return {
        "success": result.success,
        "items_extracted": len(result.items),
        "items": result.items,
        "metadata": result.metadata,
        "errors": result.errors,
        "template_id": template_config.get("id"),
        "template_version": template_config.get("version"),
        "debug_info": result.debug_info
    }