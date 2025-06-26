#!/usr/bin/env python3
"""
Test script to debug battery capacity parsing for BZ4X electric vehicles
"""
import json
from extract_with_template import ToyotaDanishExtractor

# Load template config
with open('toyota-template-config.json', 'r') as f:
    template_config = json.load(f)

# Enable battery parsing debugging
template_config['debugging']['log_battery_parsing'] = True
template_config['debugging']['log_duplicate_removal'] = True

# Load PDF content
with open('Privatleasing_priser.pdf', 'rb') as f:
    pdf_content = f.read()

print("=== Testing Battery Capacity Parsing Fix ===")
print("Looking for BZ4X variants with proper battery capacity extraction...\n")

# Create extractor instance
extractor = ToyotaDanishExtractor(template_config)

# Run extraction
result = extractor.extract_from_pdf(pdf_content)

print(f"\n=== Extraction Results ===")
print(f"Success: {result.success}")
print(f"Total items extracted: {len(result.items)}")
print(f"Errors: {len(result.errors)}")

if result.errors:
    print("Errors encountered:")
    for error in result.errors:
        print(f"  - {error}")

# Filter for BZ4X items and check their engine specifications
bz4x_items = [item for item in result.items if item.get('model') == 'BZ4X']
print(f"\nBZ4X items found: {len(bz4x_items)}")

if bz4x_items:
    print("\nBZ4X variants and their engine specifications:")
    print("-" * 80)
    for i, item in enumerate(bz4x_items):
        variant = item.get('variant', 'N/A')
        engine_spec = item.get('engine_specification', 'N/A')
        unique_id = item.get('id', 'N/A')
        monthly_price = item.get('monthly_price', 'N/A')
        
        # Check for problematic patterns
        has_none = 'None' in engine_spec if engine_spec != 'N/A' else False
        has_malformed_id = ',_hk_' in unique_id if unique_id != 'N/A' else False
        
        status = "❌ ISSUE" if (has_none or has_malformed_id) else "✅ OK"
        
        print(f"{i+1:2d}. {variant:25} | {engine_spec:25} | {unique_id:30} | {monthly_price} DKK | {status}")
        
        if has_none:
            print(f"    └─ WARNING: Engine spec contains 'None'")
        if has_malformed_id:
            print(f"    └─ WARNING: Malformed ID with ',_hk_' pattern")

print("-" * 80)

# Check for any items with problematic engine specifications
problematic_items = []
for item in result.items:
    engine_spec = item.get('engine_specification', '')
    unique_id = item.get('id', '')
    
    if 'None' in engine_spec or ',_hk_' in unique_id:
        problematic_items.append(item)

if problematic_items:
    print(f"\n❌ Found {len(problematic_items)} items with problematic engine specs or IDs:")
    for item in problematic_items:
        print(f"  - {item.get('model', 'N/A')} {item.get('variant', 'N/A')}: {item.get('engine_specification', 'N/A')}")
        print(f"    ID: {item.get('id', 'N/A')}")
else:
    print(f"\n✅ No problematic engine specifications or IDs found!")

print(f"\n=== Summary ===")
print(f"Battery parsing fix appears to be {'working correctly' if not problematic_items else 'still having issues'}")