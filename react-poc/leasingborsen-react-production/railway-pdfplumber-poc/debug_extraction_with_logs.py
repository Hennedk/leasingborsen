#!/usr/bin/env python3
"""
Debug the full Toyota extraction process with enhanced logging
"""
import json
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from extract_with_template import ToyotaDanishExtractor

def debug_full_extraction():
    """Run full extraction with debug logging"""
    
    # Load template config
    with open('toyota-template-config.json', 'r') as f:
        template_config = json.load(f)
    
    # Load PDF content
    with open('Privatleasing_priser.pdf', 'rb') as f:
        pdf_content = f.read()
    
    print("=== Running Full Toyota PDF Extraction with Debug ===\n")
    
    # Create extractor instance
    extractor = ToyotaDanishExtractor(template_config)
    
    # Run extraction
    result = extractor.extract_from_pdf(pdf_content)
    
    print(f"Extraction successful: {result.success}")
    print(f"Items extracted: {len(result.items)}")
    print(f"Errors: {len(result.errors)}")
    
    if result.errors:
        print("Errors encountered:")
        for error in result.errors:
            print(f"  - {error}")
    
    print("\nFirst 5 extracted items:")
    for i, item in enumerate(result.items[:5]):
        print(f"{i+1}. {item.get('model', 'N/A')} | {item.get('variant', 'N/A')} | {item.get('engine_specification', 'N/A')}")
    
    # Count unique combinations
    unique_combinations = set()
    for item in result.items:
        combo = f"{item.get('model', '')}__{item.get('variant', '')}"
        unique_combinations.add(combo)
    
    print(f"\nUnique model-variant combinations: {len(unique_combinations)}")
    
    # Check if any variants include engine specifications
    variants_with_engine = 0
    for item in result.items:
        variant = item.get('variant', '')
        if any(word in variant.lower() for word in ['hk', 'kwh', 'benzin', 'hybrid']):
            variants_with_engine += 1
    
    print(f"Variants that include engine specifications: {variants_with_engine}/{len(result.items)}")
    
    if variants_with_engine == 0:
        print("\n❌ ISSUE CONFIRMED: Standardization is not working during extraction")
        print("   Variants do not include engine specifications")
    else:
        print(f"\n✅ Standardization appears to be working for {variants_with_engine} items")

if __name__ == '__main__':
    debug_full_extraction()