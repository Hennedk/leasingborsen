#!/usr/bin/env python3
"""
Admin Toyota Upload Integration Example

This shows how to integrate the enhanced Toyota variant extraction system
with the admin/toyota upload feature.
"""

from toyota_extraction_api import create_extraction_api
import json
import logging

# Configure logging for admin interface
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def process_toyota_upload(pdf_file_bytes: bytes, filename: str) -> dict:
    """
    Process Toyota PDF upload for admin interface
    
    This function can be called from your admin upload endpoint
    """
    try:
        # Initialize the enhanced extraction API
        api = create_extraction_api()
        
        # Extract variants with enhanced processing
        result = api.extract_from_pdf_bytes(pdf_file_bytes, filename)
        
        # Return structured response for admin interface
        return {
            "status": "success" if result["success"] else "error",
            "message": result.get("validation_message", "Extraction completed"),
            "data": {
                "total_variants": result["total_variants"],
                "expected_variants": 27,
                "validation_passed": result.get("validation", {}).get("validation_passed", False),
                "variant_breakdown": result["variant_breakdown"],
                "extraction_stats": result.get("extraction_stats", {}),
                "variants": result["variants"],
                "enhanced_features_active": bool(result.get("extraction_stats"))
            },
            "errors": result.get("errors", [])
        }
        
    except Exception as e:
        logging.error(f"Admin Toyota upload processing failed: {e}")
        return {
            "status": "error",
            "message": f"Processing failed: {str(e)}",
            "data": {
                "total_variants": 0,
                "expected_variants": 27,
                "validation_passed": False,
                "variant_breakdown": {},
                "extraction_stats": {},
                "variants": [],
                "enhanced_features_active": False
            },
            "errors": [str(e)]
        }

def get_toyota_extraction_info() -> dict:
    """
    Get information about Toyota extraction capabilities for admin interface
    """
    try:
        api = create_extraction_api()
        expected = api.get_expected_variants()
        
        return {
            "status": "success",
            "data": {
                "extraction_system": "Enhanced Toyota Variant Extraction v2.0",
                "total_expected_variants": expected["total_expected"],
                "model_breakdown": expected["breakdown"],
                "enhanced_features": expected["enhanced_features"],
                "features_active": True
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Could not load extraction info: {str(e)}",
            "data": {
                "extraction_system": "Basic Toyota Extraction (Fallback)",
                "total_expected_variants": 27,
                "features_active": False
            }
        }

def validate_toyota_extraction_result(result: dict) -> dict:
    """
    Validate Toyota extraction result for admin interface
    """
    validation = {
        "passed": False,
        "total_found": result.get("total_variants", 0),
        "expected_total": 27,
        "issues": [],
        "model_analysis": {}
    }
    
    # Check total count
    if validation["total_found"] != 27:
        validation["issues"].append(f"Expected 27 variants, found {validation['total_found']}")
    
    # Analyze by model
    breakdown = result.get("variant_breakdown", {})
    expected_counts = {
        "AYGO X": 4,
        "YARIS": 4, 
        "YARIS CROSS": 6,
        "COROLLA TOURING SPORTS": 4,
        "BZ4X": 7,
        "URBAN CRUISER": 2
    }
    
    for model, expected_count in expected_counts.items():
        actual_count = breakdown.get(model, {}).get("count", 0)
        validation["model_analysis"][model] = {
            "expected": expected_count,
            "found": actual_count,
            "status": "✅" if actual_count == expected_count else "❌"
        }
        
        if actual_count != expected_count:
            validation["issues"].append(f"{model}: expected {expected_count}, found {actual_count}")
    
    # Check enhanced features
    enhanced_stats = result.get("extraction_stats", {})
    if enhanced_stats:
        validation["enhanced_features"] = {
            "aygo_x_transmission_detected": enhanced_stats.get("aygo_x_manual_found", 0) + enhanced_stats.get("aygo_x_automatic_found", 0),
            "bz4x_awd_detected": enhanced_stats.get("bz4x_awd_found", 0),
            "yaris_cross_high_power_detected": enhanced_stats.get("yaris_cross_high_power_found", 0)
        }
    
    validation["passed"] = len(validation["issues"]) == 0
    
    return validation

# Example usage in admin endpoint:
"""
from admin_toyota_integration_example import process_toyota_upload, validate_toyota_extraction_result

# In your admin upload endpoint:
@app.route('/admin/toyota/upload', methods=['POST'])
def admin_toyota_upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Only PDF files allowed'}), 400
    
    # Process with enhanced extraction
    pdf_bytes = file.read()
    result = process_toyota_upload(pdf_bytes, file.filename)
    
    # Validate extraction
    validation = validate_toyota_extraction_result(result)
    result['validation_details'] = validation
    
    return jsonify(result)

# Get extraction info endpoint:
@app.route('/admin/toyota/info', methods=['GET'])
def admin_toyota_info():
    info = get_toyota_extraction_info()
    return jsonify(info)
"""

if __name__ == "__main__":
    # Test the integration
    info = get_toyota_extraction_info()
    print("Toyota Extraction Info:")
    print(json.dumps(info, indent=2, ensure_ascii=False))