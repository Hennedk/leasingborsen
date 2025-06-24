#!/usr/bin/env python3
"""
Toyota PDF Extraction API - Enhanced Integration for Admin Upload Feature

This module provides a simplified API for the admin/toyota upload feature to use
the enhanced Toyota variant extraction system.
"""

import json
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path

# Import the enhanced extraction system
from extract_with_template import ToyotaDanishExtractor, ExtractionResult

class ToyotaExtractionAPI:
    """
    Simplified API for Toyota PDF extraction with enhanced variant processing
    """
    
    def __init__(self, config_path: str = "toyota-template-config.json"):
        """Initialize the extraction API with enhanced features"""
        self.config_path = config_path
        self.extractor = None
        self._load_config()
        
    def _load_config(self):
        """Load Toyota extraction configuration"""
        try:
            config_file = Path(self.config_path)
            if not config_file.exists():
                raise FileNotFoundError(f"Configuration file not found: {self.config_path}")
                
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                
            # Initialize the enhanced extractor
            self.extractor = ToyotaDanishExtractor(config)
            logging.info(f"Toyota extraction API initialized with enhanced features")
            
        except Exception as e:
            logging.error(f"Failed to initialize Toyota extraction API: {e}")
            raise
    
    def extract_from_pdf_bytes(self, pdf_bytes: bytes, filename: str = "upload.pdf") -> Dict[str, Any]:
        """
        Extract Toyota variants from PDF bytes (for admin upload feature)
        
        Args:
            pdf_bytes: The PDF file as bytes
            filename: Original filename for logging
            
        Returns:
            Dictionary with extraction results including enhanced variant data
        """
        try:
            logging.info(f"Starting enhanced Toyota extraction for: {filename}")
            
            # Extract using the enhanced system
            result = self.extractor.extract_from_pdf_bytes(pdf_bytes)
            
            # Format response for admin interface
            response = {
                "success": result.success,
                "filename": filename,
                "total_variants": len(result.items),
                "variants": result.items,
                "metadata": result.metadata,
                "errors": result.errors,
                "enhanced_features": {
                    "aygo_x_transmission_detection": True,
                    "bz4x_awd_preservation": True,
                    "yaris_cross_high_power_detection": True,
                    "enhanced_deduplication": True
                }
            }
            
            # Add extraction statistics if enhanced extractor was used
            if hasattr(self.extractor, 'enhanced_extractor') and self.extractor.enhanced_extractor:
                stats = self.extractor.enhanced_extractor.get_statistics()
                response["extraction_stats"] = {
                    "total_processed": stats.total_processed,
                    "aygo_x_manual_found": stats.aygo_x_manual_found,
                    "aygo_x_automatic_found": stats.aygo_x_auto_found,
                    "bz4x_awd_found": stats.bz4x_awd_found,
                    "yaris_cross_high_power_found": stats.yaris_cross_high_power_found,
                    "errors_encountered": stats.errors_encountered
                }
                
                # Validate against expected 27 variants
                validation = self.extractor.enhanced_extractor.validate_extraction_results(result.items)
                response["validation"] = validation
                
                if validation["validation_passed"]:
                    response["validation_message"] = "✅ Successfully extracted all 27 expected Toyota variants"
                else:
                    response["validation_message"] = f"⚠️ Expected 27 variants, got {validation['total_variants']}"
            
            # Add variant breakdown for admin interface
            variant_breakdown = self._create_variant_breakdown(result.items)
            response["variant_breakdown"] = variant_breakdown
            
            logging.info(f"Enhanced extraction completed: {len(result.items)} variants extracted")
            return response
            
        except Exception as e:
            logging.error(f"Error in Toyota PDF extraction: {e}")
            return {
                "success": False,
                "filename": filename,
                "total_variants": 0,
                "variants": [],
                "metadata": {},
                "errors": [str(e)],
                "extraction_stats": {},
                "validation": {"validation_passed": False, "total_variants": 0}
            }
    
    def _create_variant_breakdown(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create a breakdown of variants by model for the admin interface"""
        breakdown = {}
        
        for item in items:
            model = item.get("model", "Unknown")
            if model not in breakdown:
                breakdown[model] = {
                    "count": 0,
                    "variants": []
                }
            
            breakdown[model]["count"] += 1
            breakdown[model]["variants"].append({
                "variant": item.get("variant", ""),
                "engine_specification": item.get("engine_specification", ""),
                "monthly_price": item.get("monthly_price"),
                "transmission_type": item.get("transmission_type"),
                "drivetrain_type": item.get("drivetrain_type"),
                "is_enhanced": item.get("extraction_enhanced", False)
            })
        
        # Sort variants within each model
        for model_data in breakdown.values():
            model_data["variants"].sort(key=lambda x: x["variant"])
        
        return breakdown
    
    def get_expected_variants(self) -> Dict[str, Any]:
        """Get the expected Toyota variant configuration for validation"""
        return {
            "total_expected": 27,
            "breakdown": {
                "AYGO X": {
                    "expected_count": 4,
                    "description": "2 manual + 2 automatic transmission variants"
                },
                "YARIS": {
                    "expected_count": 4,
                    "description": "Standard hybrid variants"
                },
                "YARIS CROSS": {
                    "expected_count": 6,
                    "description": "4 standard power + 2 high-power variants (Elegant, GR Sport)"
                },
                "COROLLA TOURING SPORTS": {
                    "expected_count": 4,
                    "description": "Hybrid touring sports variants"
                },
                "BZ4X": {
                    "expected_count": 7,
                    "description": "4 FWD + 3 AWD electric variants"
                },
                "URBAN CRUISER": {
                    "expected_count": 2,
                    "description": "Electric SUV variants"
                }
            },
            "enhanced_features": [
                "Context-aware AYGO X transmission detection",
                "BZ4X AWD preservation during deduplication", 
                "YARIS CROSS high-power variant detection",
                "Enhanced signature-based deduplication"
            ]
        }

def create_extraction_api(config_path: str = "toyota-template-config.json") -> ToyotaExtractionAPI:
    """Factory function to create Toyota extraction API instance"""
    return ToyotaExtractionAPI(config_path)

# Example usage for admin/toyota upload feature
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        
        # Initialize API
        api = create_extraction_api()
        
        # Read PDF file
        with open(pdf_path, 'rb') as f:
            pdf_bytes = f.read()
        
        # Extract variants
        result = api.extract_from_pdf_bytes(pdf_bytes, pdf_path)
        
        # Print results
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("Usage: python toyota_extraction_api.py <pdf_file>")
        print("Example: python toyota_extraction_api.py Privatleasing_priser.pdf")