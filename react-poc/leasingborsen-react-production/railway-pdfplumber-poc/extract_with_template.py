# extract_with_template.py - Production template-based extraction

import pdfplumber
import re
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

@dataclass
class ExtractionResult:
    success: bool
    items: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    errors: List[str]

class TemplateExtractor:
    def __init__(self, template_config: Dict[str, Any]):
        self.config = template_config
        self.extraction_rules = template_config["extraction_rules"]
        self.validation_rules = template_config["validation_rules"]
        self.pdfplumber_config = template_config["pdfplumber_config"]
    
    def extract_from_pdf(self, pdf_content: bytes) -> ExtractionResult:
        """Extract items using template configuration"""
        items = []
        errors = []
        
        try:
            with pdfplumber.open(pdf_content) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    page_items = self._extract_from_page(page, page_num + 1)
                    items.extend(page_items)
                
                # Post-processing
                items = self._post_process_items(items)
                
                # Validation
                validated_items = []
                for item in items:
                    validation_result = self._validate_item(item)
                    if validation_result["valid"]:
                        # Update confidence for car models
                        if item.get("type") == "car_model":
                            item["confidence"] = self._calculate_car_confidence(item)
                        validated_items.append(item)
                    else:
                        errors.extend(validation_result["errors"])
                
                return ExtractionResult(
                    success=True,
                    items=validated_items,
                    metadata={
                        "pages_processed": len(pdf.pages),
                        "raw_items_found": len(items),
                        "validated_items": len(validated_items),
                        "template_version": self.config["version"],
                        "extraction_method": "template_based"
                    },
                    errors=errors
                )
                
        except Exception as e:
            return ExtractionResult(
                success=False,
                items=[],
                metadata={},
                errors=[f"Extraction failed: {str(e)}"]
            )
    
    def _extract_from_page(self, page, page_num: int) -> List[Dict[str, Any]]:
        """Extract items from a single page"""
        items = []
        
        # Extract tables with template settings
        tables = page.extract_tables(self.pdfplumber_config["table_settings"])
        
        for table_idx, table in enumerate(tables):
            if not table or len(table) < 2:
                continue
            
            table_items = self._extract_from_table(table, page_num, table_idx)
            items.extend(table_items)
        
        return items
    
    def _extract_from_table(self, table: List[List[str]], page_num: int, table_idx: int) -> List[Dict[str, Any]]:
        """Extract items from a table using price patterns"""
        items = []
        
        for row_idx, row in enumerate(table):
            if not row:
                continue
            
            # Find prices in this row
            price_data = self._find_prices_in_row(row)
            
            for price_info in price_data:
                # Find corresponding item name
                item_name = self._find_item_name(table, row_idx, price_info["column"])
                
                if item_name and len(item_name.strip()) >= 3:
                    item = {
                        "type": "accessory",
                        "item_name": item_name.strip(),
                        "monthly_price": price_info["value"],
                        "currency": "DKK",
                        "source": {
                            "page": page_num,
                            "table": table_idx,
                            "row": row_idx,
                            "column": price_info["column"]
                        },
                        "raw_price_text": price_info["raw_text"],
                        "confidence": self._calculate_confidence(item_name, price_info)
                    }
                    
                    # Add category if possible
                    category = self._categorize_item(item_name)
                    if category:
                        item["category"] = category
                    
                    items.append(item)
        
        return items
    
    def _find_prices_in_row(self, row: List[str]) -> List[Dict[str, Any]]:
        """Find all prices in a table row"""
        prices = []
        
        for col_idx, cell in enumerate(row):
            if not cell:
                continue
            
            # Check each price pattern from template
            for pattern_config in self.extraction_rules["price_patterns"]:
                pattern = pattern_config["pattern"]
                matches = re.finditer(pattern, cell, re.IGNORECASE)
                
                for match in matches:
                    try:
                        price_value = int(match.group(1))
                        
                        # Validate price range
                        if (pattern_config["min_value"] <= price_value <= pattern_config["max_value"]):
                            prices.append({
                                "value": price_value,
                                "column": col_idx,
                                "raw_text": cell,
                                "pattern_matched": pattern_config["description"]
                            })
                    except (ValueError, IndexError):
                        continue
        
        return prices
    
    def _find_item_name(self, table: List[List[str]], price_row: int, price_col: int) -> Optional[str]:
        """Find item name using template strategies"""
        strategies = self.extraction_rules["item_name_detection"]["strategies"]
        filters = self.extraction_rules["item_name_detection"]["filters"]
        
        for strategy in strategies:
            item_name = None
            
            if strategy == "same_column_above":
                # Look for text above in same column
                for check_row in range(max(0, price_row - 5), price_row):
                    if (check_row < len(table) and 
                        price_col < len(table[check_row]) and 
                        table[check_row][price_col]):
                        
                        text = table[check_row][price_col].strip()
                        if self._is_valid_item_name(text, filters):
                            item_name = text
                            break
            
            elif strategy == "first_column_same_row":
                # Check first column of same row
                if len(table[price_row]) > 0 and table[price_row][0]:
                    text = table[price_row][0].strip()
                    if self._is_valid_item_name(text, filters):
                        item_name = text
            
            elif strategy == "nearest_non_price_text":
                # Find nearest text that's not a price
                row = table[price_row]
                for col_idx, cell in enumerate(row):
                    if (col_idx != price_col and 
                        cell and 
                        "kr" not in cell.lower() and
                        self._is_valid_item_name(cell.strip(), filters)):
                        item_name = cell.strip()
                        break
            
            if item_name:
                return item_name
        
        return None
    
    def _is_valid_item_name(self, text: str, filters: Dict[str, Any]) -> bool:
        """Check if text is a valid item name"""
        if len(text) < filters["min_length"]:
            return False
        
        # Check exclude patterns
        for pattern in filters["exclude_patterns"]:
            if re.search(pattern, text, re.IGNORECASE):
                return False
        
        # Check exclude keywords
        text_lower = text.lower()
        for keyword in filters["exclude_keywords"]:
            if keyword.lower() in text_lower:
                return False
        
        return True
    
    def _categorize_item(self, item_name: str) -> Optional[str]:
        """Categorize item based on name"""
        categorization = self.config["post_processing"]["item_categorization"]
        item_name_lower = item_name.lower()
        
        for category, keywords in categorization.items():
            if any(keyword.lower() in item_name_lower for keyword in keywords):
                return category
        
        return "other"
    
    def _calculate_confidence(self, item_name: str, price_info: Dict[str, Any]) -> float:
        """Calculate extraction confidence score"""
        confidence = 0.8  # Base confidence
        
        # Boost confidence for clear item names
        if len(item_name) > 10:
            confidence += 0.1
        
        # Boost confidence for reasonable prices
        price = price_info["value"]
        if 50 <= price <= 500:  # Sweet spot for accessory prices
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _post_process_items(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Post-process extracted items"""
        # Remove duplicates
        seen = set()
        unique_items = []
        
        for item in items:
            # Create key for duplicate detection
            key = (item["item_name"].lower().strip(), item["monthly_price"])
            
            if key not in seen:
                seen.add(key)
                unique_items.append(item)
        
        return unique_items
    
    def _validate_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Validate extracted item against template rules"""
        errors = []
        
        # Check required fields
        for field in self.validation_rules["required_fields"]:
            if field not in item or not item[field]:
                errors.append(f"Missing required field: {field}")
        
        # Validate price range
        price = item.get("monthly_price", 0)
        price_range = self.validation_rules["price_range"]
        if not (price_range["min"] <= price <= price_range["max"]):
            errors.append(f"Price {price} outside valid range {price_range['min']}-{price_range['max']}")
        
        # Validate item name
        item_name = item.get("item_name", "")
        name_rules = self.validation_rules["item_name"]
        if not (name_rules["min_length"] <= len(item_name) <= name_rules["max_length"]):
            errors.append(f"Item name length invalid: {len(item_name)}")
        
        if not re.match(name_rules["pattern"], item_name):
            errors.append(f"Item name contains invalid characters: {item_name}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }

# Helper function for API integration
def extract_with_template(pdf_content: bytes, template_config: Dict[str, Any]) -> Dict[str, Any]:
    """Main function for template-based extraction"""
    extractor = TemplateExtractor(template_config)
    result = extractor.extract_from_pdf(pdf_content)
    
    return {
        "success": result.success,
        "items_extracted": len(result.items),
        "items": result.items,
        "metadata": result.metadata,
        "errors": result.errors,
        "template_id": template_config.get("id"),
        "template_version": template_config.get("version")
    }