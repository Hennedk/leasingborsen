#!/usr/bin/env python3
"""
Test Toyota variant standardization method directly
"""
import json
import sys
import os

# Add current directory to path to import the extractor
sys.path.append(os.getcwd())

from extract_with_template import ToyotaDanishExtractor

def test_standardization():
    """Test the _standardize_variant_name method directly"""
    
    # Load template config
    with open('toyota-template-config.json', 'r') as f:
        template_config = json.load(f)
    
    # Create extractor instance
    extractor = ToyotaDanishExtractor(template_config)
    
    # Test with sample items from current extraction
    test_items = [
        {
            "model": "AYGO X",
            "variant": "Active",
            "engine_specification": "1.0 benzin 72 hk automatgear"
        },
        {
            "model": "BZ4X", 
            "variant": "Active",
            "engine_specification": "57.7 kWh, 167 hk"
        },
        {
            "model": "BZ4X",
            "variant": "Executive Panorama", 
            "engine_specification": "73.1 kWh, 343 hk AWD"
        }
    ]
    
    print("=== Testing _standardize_variant_name method directly ===\n")
    
    for i, test_item in enumerate(test_items, 1):
        print(f"Test {i}:")
        print(f"  INPUT:  {test_item['model']} | {test_item['variant']} | {test_item['engine_specification']}")
        
        # Make a copy to avoid modifying original
        item_copy = test_item.copy()
        
        # Call standardization method
        result_item = extractor._standardize_variant_name(item_copy)
        
        print(f"  OUTPUT: {result_item['model']} | {result_item['variant']} | {result_item['engine_specification']}")
        print(f"  CHANGED: {'✅ Yes' if result_item['variant'] != test_item['variant'] else '❌ No'}")
        print()

if __name__ == '__main__':
    test_standardization()