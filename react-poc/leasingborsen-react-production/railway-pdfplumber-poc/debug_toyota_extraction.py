#!/usr/bin/env python3
"""
Debug script to test Toyota variant standardization
"""
import json

def debug_toyota_extraction():
    """Debug the current Toyota extraction results"""
    
    # Load current extraction results (use the fixed version)
    with open('toyota_extraction_fixed.json', 'r') as f:
        data = json.load(f)
    
    print("=== Toyota Extraction Debug Analysis ===\n")
    print(f"Total items extracted: {len(data['items'])}")
    
    # Check field presence
    missing_fields = {
        'variant': 0,
        'engine_specification': 0,
        'model': 0
    }
    
    items_with_all_fields = []
    items_missing_fields = []
    
    for i, item in enumerate(data['items']):
        fields_present = []
        fields_missing = []
        
        for field in ['variant', 'engine_specification', 'model']:
            if field in item and item[field] and str(item[field]).strip():
                fields_present.append(field)
            else:
                fields_missing.append(field)
                missing_fields[field] += 1
        
        if len(fields_missing) == 0:
            items_with_all_fields.append(item)
        else:
            items_missing_fields.append({
                'index': i + 1,
                'item': item,
                'missing': fields_missing
            })
    
    print(f"Items with all required fields (variant, engine_specification, model): {len(items_with_all_fields)}")
    print(f"Items missing required fields: {len(items_missing_fields)}")
    print()
    
    if missing_fields['variant'] > 0 or missing_fields['engine_specification'] > 0 or missing_fields['model'] > 0:
        print("Missing field counts:")
        for field, count in missing_fields.items():
            if count > 0:
                print(f"  - {field}: {count} items")
        print()
    
    if items_missing_fields:
        print("Items missing required fields:")
        for item_info in items_missing_fields[:5]:  # Show first 5
            print(f"  {item_info['index']:2d}. {item_info['item'].get('model', 'NO_MODEL')} - Missing: {', '.join(item_info['missing'])}")
        if len(items_missing_fields) > 5:
            print(f"     ... and {len(items_missing_fields) - 5} more")
        print()
    
    # Check if variants are already standardized
    print("Sample of current variant vs engine combinations:")
    print("-" * 80)
    for i, item in enumerate(data['items'][:10]):
        variant = item.get('variant', 'NO_VARIANT')
        engine = item.get('engine_specification', 'NO_ENGINE')
        model = item.get('model', 'NO_MODEL')
        
        # Check if variant already includes engine spec
        variant_includes_engine = any(word in variant.lower() for word in ['hk', 'kwh', 'benzin', 'hybrid', 'electric', 'automatgear'])
        
        print(f"{i+1:2d}. {model:20} | {variant:30} | {engine:30} | Combined: {'✅' if variant_includes_engine else '❌'}")
    
    print("-" * 80)
    
    # Count unique combinations that should exist
    expected_combinations = set()
    for item in items_with_all_fields:
        model = item['model']
        variant = item['variant']
        engine = item['engine_specification']
        
        # Create what the combined variant should be
        combined_variant = f"{variant} {engine}"
        combined_key = f"{model}_{combined_variant}"
        expected_combinations.add(combined_key)
    
    current_combinations = set()
    for item in data['items']:
        model = item.get('model', '')
        variant = item.get('variant', '')
        current_key = f"{model}_{variant}"
        current_combinations.add(current_key)
    
    print(f"\nCurrent unique model_variant combinations: {len(current_combinations)}")
    print(f"Expected unique model_variant combinations (with engine): {len(expected_combinations)}")
    print(f"Target combinations needed: 27")
    print()
    
    if len(expected_combinations) >= 27:
        print("✅ SOLUTION: Standardization should create enough unique combinations")
        print("❌ ISSUE: _standardize_variant_name is either not being called or not working")
    else:
        print("❌ ISSUE: Not enough unique engine+variant combinations in source data")
        print("   Need to improve engine specification extraction")

if __name__ == '__main__':
    debug_toyota_extraction()