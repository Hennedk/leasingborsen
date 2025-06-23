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
        
        # Try table extraction first
        tables = page.extract_tables(self.pdfplumber_config["table_settings"])
        
        if self.debug.get("log_table_structure", False):
            self._log_debug("tables_found", {
                "page": page_num,
                "tables_count": len(tables),
                "table_sizes": [(len(t), len(t[0]) if t and t[0] else 0) for t in tables if t]
            })
        
        # Process tables if found
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
        
        # If no tables found, try text-based extraction
        if not items and current_model:
            self._log_debug("extraction_stages", f"No tables found on page {page_num}, trying text-based extraction")
            text_items = self._extract_variants_from_text(text, current_model, page_num)
            items.extend(text_items)
        
        return items
    
    def _detect_model_on_page(self, text: str) -> Optional[str]:
        """Detect Toyota model from page text with improved pattern matching"""
        # Priority-ordered patterns for better model detection
        model_patterns = [
            (r'(YARIS CROSS)\s+SE UDSTYRSVARIANTER', 'YARIS CROSS'),
            (r'(COROLLA TOURING SPORTS)\s+SE UDSTYRSVARIANTER', 'COROLLA TOURING SPORTS'),  
            (r'(URBAN CRUISER)\s+SE UDSTYRSVARIANTER', 'URBAN CRUISER'),
            (r'(AYGO X)\s+SE UDSTYRSVARIANTER', 'AYGO X'),
            (r'(BZ4X)\s+SE UDSTYRSVARIANTER', 'BZ4X'),
            (r'(YARIS)\s+SE UDSTYRSVARIANTER', 'YARIS'),  # Check after YARIS CROSS
            # Fallback patterns without SE UDSTYRSVARIANTER
            (r'(YARIS CROSS)', 'YARIS CROSS'),
            (r'(COROLLA TOURING SPORTS)', 'COROLLA TOURING SPORTS'),
            (r'(URBAN CRUISER)', 'URBAN CRUISER'),
            (r'(AYGO X)', 'AYGO X'),
            (r'(BZ4X)', 'BZ4X'),
            (r'(COROLLA)', 'COROLLA'),  # COROLLA should match after COROLLA TOURING SPORTS
            (r'(YARIS)', 'YARIS')       # YARIS should match after YARIS CROSS
        ]
        
        # Try patterns in priority order
        for pattern, model_name in model_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                self._log_debug("extraction_stages", f"Model detected with pattern '{pattern}': {model_name}")
                return model_name
        
        # Legacy fallback using configured model list
        toyota_models = self.extraction_rules["toyota_models"]
        text_upper = text.upper()
        for model in toyota_models:
            if model.upper() in text_upper:
                self._log_debug("extraction_stages", f"Model detected with fallback: {model}")
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
    
    def _extract_variants_from_text(self, text: str, model: str, page_num: int) -> List[Dict[str, Any]]:
        """Extract car variants from structured text when tables aren't detected"""
        items = []
        
        self._log_debug("extraction_stages", f"Attempting text-based extraction for model {model}")
        
        # Split text into lines
        lines = text.split('\n')
        
        # Look for pricing lines that match the Danish format
        for line_idx, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # Look for lines that contain pricing information
            # Pattern: "Active 2.699 4.999 37.387 102.163 20,83/110 15.000 590"
            if self._contains_price_pattern(line):
                self._log_debug("pattern_matches", f"Found potential pricing line: {line}")
                
                # Extract variant data from this line
                variant_data = self._parse_pricing_line(line, model, page_num, line_idx)
                if variant_data:
                    items.append(variant_data)
                    self._log_debug("extraction_stages", f"Extracted variant from text: {variant_data['variant']}")
        
        return items
    
    def _parse_pricing_line(self, line: str, model: str, page_num: int, line_idx: int) -> Optional[Dict[str, Any]]:
        """Parse pricing line with comprehensive field extraction"""
        
        # Clean the line
        line = line.strip()
        if not line:
            return None
        
        self._log_debug("pattern_matches", f"Parsing line: {line}")
        
        # Try different parsing patterns based on the line format
        result = None
        
        # Pattern 1: Standard format - "Active 2.699 4.999 37.387 102.163 20,83/110 15.000 590"
        pattern1 = r'^([A-Za-z\s]+?)\s+(\d\.\d{3})\s+(\d\.\d{3})\s+(\d{2}\.\d{3})\s+(\d{2,3}\.\d{3})\s+([\d,]+/\d+)\s+(\d{2}\.\d{3})\s+(\d{3,4})$'
        match1 = re.match(pattern1, line)
        if match1:
            result = self._parse_standard_format(match1, model, page_num, line_idx, line)
        
        # Pattern 2: Electric format - "Active 3.999 9.999 57.987 153.963 136 444 57,7/54 15.000 420"
        pattern2 = r'^([A-Za-z\s]+?)\s+(\d\.\d{3})\s+(\d\.\d{3})\s+(\d{2}\.\d{3})\s+(\d{2,3}\.\d{3})\s+(\d{3})\s+(\d{3})\s+([\d,/\-]+)\s+(\d{2}\.\d{3})\s+(\d{3,4})$'
        match2 = re.match(pattern2, line)
        if not result and match2:
            result = self._parse_electric_format(match2, model, page_num, line_idx, line)
        
        # Pattern 3: Compact format - "Active 3.949 0 47.388 142.164 22,2/101 15.000 580"
        pattern3 = r'^([A-Za-z\s]+?)\s+(\d\.\d{3})\s+(\d+)\s+(\d{2}\.\d{3})\s+(\d{2,3}\.\d{3})\s+([\d,]+/\d+)\s+(\d{2}\.\d{3})\s+(\d{3,4})$'
        match3 = re.match(pattern3, line)
        if not result and match3:
            result = self._parse_compact_format(match3, model, page_num, line_idx, line)
        
        # Pattern 4: Fallback to flexible parsing
        if not result:
            result = self._parse_flexible_format(line, model, page_num, line_idx)
        
        if result:
            self._log_debug("extraction_stages", f"Successfully parsed variant: {result.get('variant')}")
        
        return result
    
    def _parse_standard_format(self, match, model: str, page_num: int, line_idx: int, raw_line: str) -> Dict[str, Any]:
        """Parse standard format: variant monthly first_payment minimum total fuel_eco annual co2_tax"""
        variant_name = match.group(1).strip()
        monthly_price = int(match.group(2).replace('.', ''))
        first_payment = int(match.group(3).replace('.', ''))
        minimum_12m = int(match.group(4).replace('.', ''))
        total_cost = int(match.group(5).replace('.', ''))
        fuel_economy = match.group(6)  # e.g., "20,83/110"
        annual_km = int(match.group(7).replace('.', ''))
        co2_tax = int(match.group(8))
        
        # Extract CO2 emissions from fuel economy
        co2_emissions = self._extract_co2_from_fuel_economy(fuel_economy)
        fuel_consumption = self._extract_fuel_consumption_from_fuel_economy(fuel_economy)
        
        # Build engine specification for unique ID generation
        engine_spec = self._build_engine_specification_standard(fuel_economy, co2_emissions, fuel_consumption)
        
        return {
            "type": "car_model",
            "make": "Toyota",
            "model": model,
            "variant": variant_name,
            "engine_specification": engine_spec,
            "monthly_price": monthly_price,
            "first_payment": first_payment,
            "minimum_price_12m": minimum_12m,
            "total_cost": total_cost,
            "annual_kilometers": annual_km,
            "co2_tax_biannual": co2_tax,
            "co2_emissions_gkm": co2_emissions,
            "fuel_consumption_kmpl": fuel_consumption,
            "currency": "DKK",
            "source": {
                "page": page_num,
                "line": line_idx,
                "extraction_method": "standard_format",
                "raw_line": raw_line
            },
            "confidence": 0.9
        }
    
    def _parse_electric_format(self, match, model: str, page_num: int, line_idx: int, raw_line: str) -> Dict[str, Any]:
        """Parse electric format: variant monthly first_payment minimum total electric_consumption electric_range battery annual co2_tax"""
        variant_name = match.group(1).strip()
        monthly_price = int(match.group(2).replace('.', ''))
        first_payment = int(match.group(3).replace('.', ''))
        minimum_12m = int(match.group(4).replace('.', ''))
        total_cost = int(match.group(5).replace('.', ''))
        electric_consumption = int(match.group(6))  # Wh/km
        electric_range = int(match.group(7))        # km
        battery_info = match.group(8)               # "57,7/54" (gross/net kWh)
        annual_km = int(match.group(9).replace('.', ''))
        co2_tax = int(match.group(10))
        
        # Parse battery capacity
        battery_gross, battery_net = self._parse_battery_capacity(battery_info)
        
        # Build engine specification for unique ID generation
        engine_spec = self._build_engine_specification_electric(battery_gross, electric_consumption, electric_range)
        
        return {
            "type": "car_model",
            "make": "Toyota",
            "model": model,
            "variant": variant_name,
            "engine_specification": engine_spec,
            "monthly_price": monthly_price,
            "first_payment": first_payment,
            "minimum_price_12m": minimum_12m,
            "total_cost": total_cost,
            "annual_kilometers": annual_km,
            "co2_tax_biannual": co2_tax,
            "electric_consumption_whkm": electric_consumption,
            "electric_range_km": electric_range,
            "battery_capacity_gross_kwh": battery_gross,
            "battery_capacity_net_kwh": battery_net,
            "powertrain_type": "electric",
            "co2_emissions_gkm": 0,  # Electric vehicles have 0 CO2 emissions
            "currency": "DKK",
            "source": {
                "page": page_num,
                "line": line_idx,
                "extraction_method": "electric_format",
                "raw_line": raw_line
            },
            "confidence": 0.9
        }
    
    def _parse_compact_format(self, match, model: str, page_num: int, line_idx: int, raw_line: str) -> Dict[str, Any]:
        """Parse compact format: variant monthly first_payment(0) minimum total fuel_eco annual co2_tax"""
        variant_name = match.group(1).strip()
        monthly_price = int(match.group(2).replace('.', ''))
        first_payment = int(match.group(3))  # Often 0
        minimum_12m = int(match.group(4).replace('.', ''))
        total_cost = int(match.group(5).replace('.', ''))
        fuel_economy = match.group(6)  # e.g., "22,2/101"
        annual_km = int(match.group(7).replace('.', ''))
        co2_tax = int(match.group(8))
        
        # Extract CO2 emissions from fuel economy
        co2_emissions = self._extract_co2_from_fuel_economy(fuel_economy)
        fuel_consumption = self._extract_fuel_consumption_from_fuel_economy(fuel_economy)
        
        # Build engine specification for unique ID generation
        engine_spec = self._build_engine_specification_hybrid(fuel_economy, co2_emissions, fuel_consumption)
        
        return {
            "type": "car_model",
            "make": "Toyota",
            "model": model,
            "variant": variant_name,
            "engine_specification": engine_spec,
            "monthly_price": monthly_price,
            "first_payment": first_payment if first_payment > 0 else None,
            "minimum_price_12m": minimum_12m,
            "total_cost": total_cost,
            "annual_kilometers": annual_km,
            "co2_tax_biannual": co2_tax,
            "co2_emissions_gkm": co2_emissions,
            "fuel_consumption_kmpl": fuel_consumption,
            "currency": "DKK",
            "source": {
                "page": page_num,
                "line": line_idx,
                "extraction_method": "compact_format",
                "raw_line": raw_line
            },
            "confidence": 0.8
        }
    
    def _parse_flexible_format(self, line: str, model: str, page_num: int, line_idx: int) -> Optional[Dict[str, Any]]:
        """Flexible parsing for lines that don't match standard patterns"""
        # Split the line into parts
        parts = line.split()
        if len(parts) < 3:
            return None
        
        # Extract variant name (first non-numeric parts)
        variant_parts = []
        numeric_parts = []
        
        for part in parts:
            if re.search(r'\d', part):
                numeric_parts.append(part)
            else:
                variant_parts.append(part)
        
        variant_name = ' '.join(variant_parts) if variant_parts else None
        if not variant_name or len(variant_name) < 2:
            return None
        
        if not self._looks_like_variant(variant_name):
            return None
        
        # Extract monthly price (first price in reasonable range)
        monthly_price = None
        for part in numeric_parts:
            price = self._parse_danish_price(part)
            if price and 1500 <= price <= 15000:
                monthly_price = price
                break
        
        if not monthly_price:
            return None
        
        return {
            "type": "car_model",
            "make": "Toyota",
            "model": model,
            "variant": variant_name,
            "monthly_price": monthly_price,
            "currency": "DKK",
            "source": {
                "page": page_num,
                "line": line_idx,
                "extraction_method": "flexible_format",
                "raw_line": line
            },
            "confidence": 0.6
        }
    
    def _extract_co2_from_fuel_economy(self, fuel_economy: str) -> Optional[int]:
        """Extract CO2 emissions from fuel economy string like '20,83/110'"""
        if '/' in fuel_economy:
            parts = fuel_economy.split('/')
            if len(parts) == 2:
                try:
                    return int(parts[1])  # Second part is CO2 g/km
                except ValueError:
                    pass
        return None
    
    def _extract_fuel_consumption_from_fuel_economy(self, fuel_economy: str) -> Optional[float]:
        """Extract fuel consumption from fuel economy string like '20,83/110'"""
        if '/' in fuel_economy:
            parts = fuel_economy.split('/')
            if len(parts) == 2:
                try:
                    return float(parts[0].replace(',', '.'))  # First part is km/l
                except ValueError:
                    pass
        return None
    
    def _parse_battery_capacity(self, battery_info: str) -> Tuple[Optional[float], Optional[float]]:
        """Parse battery capacity string like '57,7/54' into (gross, net) kWh"""
        if '/' in battery_info:
            parts = battery_info.split('/')
            if len(parts) == 2:
                try:
                    gross = float(parts[0].replace(',', '.'))
                    net = float(parts[1].replace(',', '.'))
                    return gross, net
                except ValueError:
                    pass
        elif '-' in battery_info:
            # Handle range format like "61,1-59,8"
            parts = battery_info.split('-')
            if len(parts) == 2:
                try:
                    gross = float(parts[0].replace(',', '.'))
                    net = float(parts[1].replace(',', '.'))
                    return gross, net
                except ValueError:
                    pass
        return None, None
    
    def _extract_fuel_consumption_from_line(self, line: str) -> Optional[float]:
        """Extract fuel consumption from a text line"""
        # Look for patterns like "20,83/110" or "22,2/101"
        fuel_match = re.search(r'(\d+[,\.]?\d+)/(\d+)', line)
        if fuel_match:
            try:
                return float(fuel_match.group(1).replace(',', '.'))
            except ValueError:
                pass
        return None
    
    def _extract_engine_spec_from_line(self, line: str) -> Optional[Dict[str, Any]]:
        """Extract engine specification from a text line"""
        # Look for engine patterns in the line context (might be above this line)
        
        # Electric: "57,7 KWh 167 hk" or "73,1 kWh, 224 hk"
        electric_match = re.search(r'(\d+[,\.]\d+)\s*[Kk][Ww][Hh][,\s]*\s*(\d+)\s*hk', line)
        if electric_match:
            battery = electric_match.group(1)
            power = electric_match.group(2)
            return {
                "specification": f"{battery} kWh {power} hk",
                "type": "electric",
                "battery_capacity_kwh": float(battery.replace(",", ".")),
                "power_hp": int(power)
            }
        
        # Hybrid: "1.5 Hybrid 116 hk"
        hybrid_match = re.search(r'(\d\.\d)\s+Hybrid\s+(\d+)\s+hk', line)
        if hybrid_match:
            displacement = hybrid_match.group(1)
            power = hybrid_match.group(2)
            return {
                "specification": f"{displacement} Hybrid {power} hk",
                "type": "hybrid",
                "displacement_l": float(displacement),
                "power_hp": int(power)
            }
        
        # Gasoline: "1.0 benzin 72 hk"
        gasoline_match = re.search(r'(\d\.\d)\s+benzin\s+(\d+)\s+hk', line)
        if gasoline_match:
            displacement = gasoline_match.group(1)
            power = gasoline_match.group(2)
            return {
                "specification": f"{displacement} benzin {power} hk",
                "type": "gasoline",
                "displacement_l": float(displacement),
                "power_hp": int(power)
            }
        
        return None
    
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
            
            # Skip items that couldn't be normalized (e.g., None monthly_price)
            if item is None:
                continue
                
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
        """Standardize variant names with transmission differentiation"""
        post_processing = self.config.get("post_processing", {})
        variant_config = post_processing.get("variant_standardization", {})
        
        # CRITICAL FIX: Add transmission to variant name to distinguish variants
        if "variant" in item and "engine_specification" in item:
            variant = item["variant"]
            engine_spec = item["engine_specification"].lower()
            
            # Add transmission suffix to variant name for gasoline engines
            if "benzin" in engine_spec:
                if "automatgear" in engine_spec:
                    # Only add "Auto" if not already in variant name
                    if "auto" not in variant.lower():
                        variant = f"{variant} Auto"
                else:
                    # Manual transmission (no automatgear mentioned)
                    if "manual" not in variant.lower():
                        variant = f"{variant} Manual"
            
            item["variant"] = variant
        
        # Continue with standard variant processing
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
            for field in ["monthly_price", "first_payment", "total_cost", "minimum_price_12m", "co2_tax_biannual"]:
                if field in item and item[field] is not None:
                    try:
                        item[field] = int(item[field])
                    except (ValueError, TypeError):
                        # Remove field if it can't be converted to int
                        if field in item:
                            del item[field]
        
        # Ensure required fields are not None
        if "monthly_price" in item and item["monthly_price"] is None:
            return None  # Skip this item if monthly_price is None
        
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
        """Remove duplicate items with enhanced Toyota-specific logic"""
        post_processing = self.config.get("post_processing", {})
        duplicate_config = post_processing.get("duplicate_removal", {})
        
        # Enhanced match fields for Toyota extraction to prevent legitimate variant removal
        # Include all key differentiators: model, variant, engine, price, and source page
        match_fields = ["model", "variant", "engine_specification", "monthly_price", "source_page"]
        
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
                elif field == "source_page" and "source" in item and "page" in item["source"]:
                    # Include source page to differentiate same items from different pages
                    key_parts.append(str(item["source"]["page"]))
                else:
                    key_parts.append("")  # Empty string for missing fields
            
            key = tuple(key_parts)
            
            if key not in seen:
                seen.add(key)
                unique_items.append(item)
            else:
                # Log duplicate detection for debugging
                if self.debug.get("log_duplicate_removal", True):
                    print(f"🔍 DUPLICATE REMOVED: {item.get('model', '')} {item.get('variant', '')} - {item.get('engine_specification', '')} - {item.get('monthly_price', '')} DKK")
        
        # Additional Toyota-specific duplicate detection for items with identical unique IDs
        final_items = []
        seen_ids = set()
        
        for item in unique_items:
            # Use the generated unique ID as final deduplication key
            unique_id = item.get('id', '')
            if unique_id and unique_id not in seen_ids:
                seen_ids.add(unique_id)
                final_items.append(item)
            elif not unique_id:
                # Keep items without IDs (shouldn't happen, but safety check)
                final_items.append(item)
            else:
                if self.debug.get("log_duplicate_removal", True):
                    print(f"🔍 DUPLICATE ID REMOVED: {unique_id} - {item.get('model', '')} {item.get('variant', '')}")
        
        print(f"📊 Deduplication: {len(items)} → {len(unique_items)} → {len(final_items)} final unique Toyota variants")
        
        return final_items
    
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
            
            if "first_payment" in item and item["first_payment"] is not None:
                first_payment = item["first_payment"]
                try:
                    first_payment = int(first_payment)  # Ensure it's an integer
                    if not (price_val["first_payment_min"] <= first_payment <= price_val["first_payment_max"]):
                        errors.append(f"First payment {first_payment} outside valid range")
                except (ValueError, TypeError):
                    errors.append(f"First payment {first_payment} is not a valid number")
            
            if "total_cost" in item and item["total_cost"] is not None:
                total_cost = item["total_cost"]
                try:
                    total_cost = int(total_cost)  # Ensure it's an integer
                    if "total_cost_min" in price_val and "total_cost_max" in price_val:
                        if not (price_val["total_cost_min"] <= total_cost <= price_val["total_cost_max"]):
                            errors.append(f"Total cost {total_cost} outside valid range")
                except (ValueError, TypeError):
                    errors.append(f"Total cost {total_cost} is not a valid number")
        
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
    
    def _build_engine_specification_standard(self, fuel_economy: str, co2_emissions: Optional[int], fuel_consumption: Optional[float]) -> str:
        """Build engine specification for gasoline/standard vehicles"""
        specs = []
        
        # Add estimated horsepower based on CO2 emissions (rough estimation)
        if co2_emissions:
            if co2_emissions <= 100:
                specs.append("1.0 benzin 72 hk")
            elif co2_emissions <= 115:
                specs.append("1.0 benzin 72 hk automatgear") 
            else:
                specs.append("1.0 benzin 72 hk")
        
        # Add transmission type from fuel economy pattern
        if "automatgear" in fuel_economy.lower():
            if "automatgear" not in specs[-1] if specs else "":
                specs.append("automatgear")
        
        return " ".join(specs) if specs else "1.0 benzin 72 hk"
    
    def _build_engine_specification_electric(self, battery_capacity: float, consumption: int, range_km: int) -> str:
        """Build engine specification for electric vehicles"""
        specs = []
        
        # Battery capacity
        specs.append(f"{battery_capacity} kWh")
        
        # Estimate horsepower based on battery size and consumption
        if battery_capacity <= 58:
            specs.append("167 hk")  # BZ4X 57.7 kWh variant
        elif battery_capacity > 73 and consumption > 140:
            specs.append("343 hk AWD")  # BZ4X AWD variant
        elif battery_capacity > 70:
            specs.append("224 hk")  # BZ4X 73.1 kWh FWD variant
        elif battery_capacity > 60:
            specs.append("174 hk")  # Urban Cruiser
        else:
            specs.append("167 hk")
        
        return ", ".join(specs)
    
    def _build_engine_specification_hybrid(self, fuel_economy: str, co2_emissions: Optional[int], fuel_consumption: Optional[float]) -> str:
        """Build engine specification for hybrid vehicles"""
        specs = []
        
        # Estimate engine based on CO2 emissions and fuel consumption
        if co2_emissions and fuel_consumption:
            if co2_emissions <= 95 and fuel_consumption >= 24:
                specs.append("1.5 Hybrid 116 hk")
            elif co2_emissions <= 110 and fuel_consumption >= 21:
                specs.append("1.5 Hybrid 130 hk")
            elif co2_emissions <= 115:
                specs.append("1.8 Hybrid 140 hk")
            else:
                specs.append("1.5 Hybrid 116 hk")
        
        # Add transmission - hybrids are typically automatic
        if "aut" not in " ".join(specs).lower():
            specs.append("automatgear")
        
        return " ".join(specs) if specs else "1.5 Hybrid 116 hk automatgear"

# Unique Variant ID Generation System
def generate_unique_variant_id(model: str, variant: str, engine_specification: str, drivetrain: Optional[str] = None) -> str:
    """
    FIXED: Generate unique identifier for each variant configuration
    
    Fixes duplicate IDs for:
    - AYGO X manual vs automatic variants
    - BZ4X Executive Panorama power variants
    
    Args:
        model: str - "BZ4X", "YARIS", "AYGO X", etc.
        variant: str - "Active", "Executive", "Executive Panorama", etc.
        engine_specification: str - "73.1 kWh, 343 hk AWD", "1.0 benzin 72 hk automatgear"
        drivetrain: str - "FWD", "AWD", "manual", "automatic"
    
    Returns:
        str - unique identifier like "bz4x_executive_panorama_343hp_awd"
    """
    
    # Extract power from engine specification
    power_hp = extract_power_from_specification(engine_specification)
    
    # Extract battery capacity for electric vehicles
    battery_kwh = extract_battery_capacity(engine_specification)
    
    # Enhanced drivetrain detection
    drivetrain_code = normalize_drivetrain(engine_specification, drivetrain)
    
    # Create base ID with enhanced variant handling
    model_clean = model.lower().replace(' ', '').replace('-', '')
    variant_clean = variant.lower().replace(' ', '_')
    
    # Handle special variant names
    if 'executive_panorama' in variant_clean:
        variant_clean = 'executive_panorama'
    
    base_id = f"{model_clean}_{variant_clean}"
    
    # Add power differentiator
    if power_hp:
        base_id += f"_{power_hp}hp"
    
    # Enhanced drivetrain/transmission logic
    powertrain_category = categorize_powertrain(engine_specification)
    
    if powertrain_category == 'electric':
        # For electric vehicles, prioritize AWD detection
        if 'awd' in drivetrain_code.lower():
            base_id += "_awd"
        else:
            # For same-power electric variants, add battery differentiation
            if battery_kwh:
                # Only add battery if there might be confusion
                if power_hp in [224, 343]:  # BZ4X power levels that might have variants
                    battery_clean = str(battery_kwh).replace('.', '_')
                    base_id += f"_{battery_clean}kwh"
            base_id += "_electric"
    
    elif powertrain_category == 'gasoline':
        # CRITICAL FIX: Proper gasoline transmission detection
        transmission = detect_gasoline_transmission(engine_specification)
        if transmission:
            base_id += f"_{transmission}"
        else:
            # Default to manual for gasoline without explicit automatgear
            base_id += "_manual"
    
    elif powertrain_category == 'hybrid':
        if 'awd' in drivetrain_code.lower():
            base_id += "_awd"
        elif 'automatgear' in engine_specification.lower():
            base_id += "_auto"
        else:
            base_id += "_hybrid"
    
    else:
        # Fallback to original logic
        if 'awd' in drivetrain_code.lower():
            base_id += "_awd"
        elif drivetrain_code in ['auto', 'manual']:
            base_id += f"_{drivetrain_code}"
    
    return base_id

def extract_power_from_specification(engine_spec: str) -> Optional[int]:
    """Extract horsepower from engine specification"""
    if not engine_spec:
        return None
    
    # Pattern for horsepower: "343 hk", "167 hp", etc.
    power_pattern = r'(\d+)\s*(?:hk|hp)'
    match = re.search(power_pattern, engine_spec, re.IGNORECASE)
    
    return int(match.group(1)) if match else None

def normalize_drivetrain(engine_spec: str, drivetrain_field: Optional[str]) -> str:
    """
    FIXED: Enhanced drivetrain normalization
    Better handling of gasoline manual vs automatic
    """
    
    if drivetrain_field:
        return drivetrain_field.lower()
    
    if not engine_spec:
        return 'fwd'
    
    engine_lower = engine_spec.lower()
    
    # Priority order detection
    if 'awd' in engine_lower:
        return 'awd'
    elif 'automatgear' in engine_lower:
        return 'auto'
    elif 'benzin' in engine_lower and 'automatgear' not in engine_lower:
        return 'manual'  # FIXED: Gasoline without automatgear = manual
    elif 'hybrid' in engine_lower:
        return 'hybrid'
    elif 'elbil' in engine_lower or 'kwh' in engine_lower:
        return 'electric'
    
    return 'fwd'  # Default

def detect_gasoline_transmission(engine_spec: str) -> Optional[str]:
    """
    FIXED: Properly detect gasoline transmission type
    
    Critical fix for AYGO X variants:
    - "1.0 benzin 72 hk" = manual
    - "1.0 benzin 72 hk automatgear" = auto
    """
    if not engine_spec:
        return None
    
    engine_lower = engine_spec.lower()
    
    # Explicit automatic detection
    if 'automatgear' in engine_lower:
        return 'auto'
    
    # If it's gasoline but no explicit automatic, it's manual
    if 'benzin' in engine_lower and 'automatgear' not in engine_lower:
        return 'manual'
    
    return None

def extract_transmission_code(engine_spec: str) -> Optional[str]:
    """Extract transmission type for non-electric vehicles"""
    
    if not engine_spec:
        return None
    
    engine_lower = engine_spec.lower()
    
    if 'automatgear' in engine_lower:
        return 'auto'
    elif 'manual' in engine_lower or 'benzin' in engine_lower:
        return 'manual' 
    
    return None  # Don't add transmission code for hybrids/electric

def categorize_powertrain(engine_spec: str) -> str:
    """Categorize powertrain type for filtering"""
    
    if not engine_spec:
        return 'unknown'
    
    engine_lower = engine_spec.lower()
    
    if 'kwh' in engine_lower or 'elbil' in engine_lower:
        return 'electric'
    elif 'hybrid' in engine_lower:
        return 'hybrid'
    elif 'benzin' in engine_lower:
        return 'gasoline'
    else:
        return 'unknown'

def extract_battery_capacity(engine_spec: str) -> Optional[float]:
    """Extract battery capacity for electric vehicles"""
    if not engine_spec:
        return None
    
    # Pattern for battery: "73.1 kWh", "57,7 KWh"
    battery_pattern = r'(\d+[,.]?\d*)\s*kwh'
    match = re.search(battery_pattern, engine_spec, re.IGNORECASE)
    
    if match:
        capacity_str = match.group(1).replace(',', '.')
        return float(capacity_str)
    
    return None

def enhance_variant_with_unique_id(variant_data: Dict[str, Any]) -> Dict[str, Any]:
    """Enhance variant data with unique identification"""
    
    model = variant_data.get('model', '')
    variant = variant_data.get('variant', '')
    engine_spec = variant_data.get('engine_specification', '')
    drivetrain = variant_data.get('drivetrain')
    
    # Generate unique identifier
    unique_id = generate_unique_variant_id(
        model=model,
        variant=variant,
        engine_specification=engine_spec,
        drivetrain=drivetrain
    )
    
    # Add enhanced fields
    enhanced_variant = {
        **variant_data,
        'id': unique_id,
        'composite_key': f"{model}_{variant}_{unique_id}",
        'power_hp': extract_power_from_specification(engine_spec),
        'battery_capacity_kwh': extract_battery_capacity(engine_spec) if categorize_powertrain(engine_spec) == 'electric' else None,
        'drivetrain_type': normalize_drivetrain(engine_spec, drivetrain),
        'powertrain_category': categorize_powertrain(engine_spec)
    }
    
    return enhanced_variant

def validate_unique_variants(extracted_items: List[Dict[str, Any]]) -> bool:
    """Validate that all variants have unique identifiers"""
    
    seen_ids = set()
    duplicates = []
    
    for item in extracted_items:
        variant_id = item.get('id')
        
        if not variant_id:
            raise ValueError(f"Missing ID for variant: {item.get('model')} {item.get('variant')}")
        
        if variant_id in seen_ids:
            duplicates.append(variant_id)
        else:
            seen_ids.add(variant_id)
    
    if duplicates:
        raise ValueError(f"Duplicate variant IDs found: {duplicates}")
    
    return True

def validate_variant_completeness(extracted_items: List[Dict[str, Any]]) -> bool:
    """Ensure all variants have required fields for uniqueness"""
    
    required_fields = ['id', 'make', 'model', 'variant', 'monthly_price']
    
    for item in extracted_items:
        missing_fields = [field for field in required_fields if not item.get(field)]
        
        if missing_fields:
            raise ValueError(f"Missing required fields {missing_fields} for variant {item.get('id', 'unknown')}")
    
    return True

# Helper function for API integration
def extract_with_template(pdf_content: bytes, template_config: Dict[str, Any]) -> Dict[str, Any]:
    """Main function for Toyota Danish template-based extraction"""
    extractor = ToyotaDanishExtractor(template_config)
    result = extractor.extract_from_pdf(pdf_content)
    
    # Enhance items with unique variant IDs
    enhanced_items = []
    for item in result.items:
        try:
            enhanced_item = enhance_variant_with_unique_id(item)
            enhanced_items.append(enhanced_item)
        except Exception as e:
            # Keep original item if enhancement fails
            print(f"Warning: Failed to enhance variant {item.get('model')} {item.get('variant')}: {e}")
            enhanced_items.append(item)
    
    # Validate uniqueness
    validation_errors = []
    try:
        validate_unique_variants(enhanced_items)
        validate_variant_completeness(enhanced_items)
    except ValueError as e:
        validation_errors.append(str(e))
    
    return {
        "success": result.success,
        "items_extracted": len(enhanced_items),
        "items": enhanced_items,
        "metadata": {
            **result.metadata,
            "unique_variants_count": len(set(item.get('id') for item in enhanced_items if item.get('id'))),
            "enhancement_applied": True
        },
        "errors": result.errors + validation_errors,
        "template_id": template_config.get("id"),
        "template_version": template_config.get("version"),
        "debug_info": result.debug_info
    }