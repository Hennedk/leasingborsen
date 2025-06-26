#!/usr/bin/env python3
"""
Debug script to test the specific BZ4X battery extraction issue
"""

import re
from typing import Optional

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

def generate_unique_variant_id_simple(model: str, variant: str, engine_specification: str) -> str:
    """Simplified ID generation to test the battery extraction issue"""
    
    # Extract power and battery
    power_pattern = r'(\d+)\s*(?:hk|hp)'
    power_match = re.search(power_pattern, engine_specification, re.IGNORECASE)
    power_hp = int(power_match.group(1)) if power_match else None
    
    battery_kwh = extract_battery_capacity(engine_specification)
    
    # Create base ID
    model_clean = model.lower().replace(' ', '').replace('-', '')
    variant_clean = variant.lower().replace(' ', '_').replace(',', '').replace('.', '_')
    
    base_id = f"{model_clean}_{variant_clean}"
    
    # Add battery for electric vehicles
    if battery_kwh:
        battery_clean = str(battery_kwh).replace('.', '_')
        base_id += f"_{battery_clean}kwh"
    
    # Add power
    if power_hp:
        base_id += f"_{power_hp}hp"
    
    return base_id

def test_problematic_bz4x():
    """Test the exact BZ4X case that's failing"""
    
    print("🔋 Testing BZ4X Battery Extraction Issue")
    print("=" * 50)
    
    # This is the exact case from the JSON file that's failing
    test_cases = [
        {
            'model': 'BZ4X',
            'variant': 'Active 57.7 Kwh, 167 Hk',  # THIS is the problematic variant
            'engine_specification': '57.7 kWh, 167 hk',
            'expected_behavior': 'Should extract battery from engine_spec, not variant'
        },
        {
            'model': 'BZ4X', 
            'variant': 'Executive 73.1 Kwh, 224 Hk',
            'engine_specification': '73.1 kWh, 224 hk',
            'expected_behavior': 'Should extract battery from engine_spec'
        },
        {
            'model': 'BZ4X',
            'variant': 'Active',  # Clean variant (what we want after fixing)
            'engine_specification': '57.7 kWh, 167 hk',
            'expected_behavior': 'Should work correctly'
        }
    ]
    
    for i, case in enumerate(test_cases, 1):
        print(f"\nTest Case {i}:")
        print(f"  Model: {case['model']}")
        print(f"  Variant: '{case['variant']}'")
        print(f"  Engine Spec: '{case['engine_specification']}'")
        print(f"  Expected: {case['expected_behavior']}")
        
        # Test battery extraction from engine spec
        battery_from_engine = extract_battery_capacity(case['engine_specification'])
        print(f"  Battery from engine_spec: {battery_from_engine}")
        
        # Test battery extraction from variant (this shouldn't be used)
        battery_from_variant = extract_battery_capacity(case['variant'])
        print(f"  Battery from variant: {battery_from_variant}")
        
        # Test the ID generation
        try:
            generated_id = generate_unique_variant_id_simple(
                case['model'], 
                case['variant'], 
                case['engine_specification']
            )
            print(f"  Generated ID: '{generated_id}'")
            
            # Check if ID looks correct
            if 'kwh' in generated_id and battery_from_engine:
                battery_in_id = str(battery_from_engine).replace('.', '_')
                if battery_in_id in generated_id:
                    print(f"  ✅ Battery correctly included: {battery_in_id}kwh")
                else:
                    print(f"  ❌ Battery missing or wrong in ID")
            elif not battery_from_engine:
                print(f"  ⚠️ No battery extracted from engine_spec!")
            
            # Check for malformed patterns
            if ',_hk' in generated_id or '_,_' in generated_id:
                print(f"  ❌ MALFORMED ID DETECTED: Contains comma artifacts!")
            else:
                print(f"  ✅ ID format looks clean")
                
        except Exception as e:
            print(f"  ❌ ERROR generating ID: {e}")

def test_variant_cleaning():
    """Test the BZ4X variant cleaning logic"""
    
    print(f"\n🧹 Testing BZ4X Variant Cleaning Logic")
    print("=" * 50)
    
    test_variants = [
        "Active 57.7 Kwh, 167 Hk",
        "Executive 73.1 Kwh, 224 Hk", 
        "Executive Panorama 73.1 Kwh, 343 Hk AWD",
        "Active",  # Already clean
        "Executive Panorama"  # Already clean
    ]
    
    for variant in test_variants:
        print(f"\nOriginal variant: '{variant}'")
        
        # Apply the cleaning regex patterns
        cleaned = variant
        
        # Remove battery specifications: "57.7 Kwh", "73.1 Kwh", etc.
        cleaned = re.sub(r'\s+\d+[.,]\d*\s*[Kk][Ww][Hh].*', '', cleaned).strip()
        
        # Remove power specifications: "167 Hk", "224 Hk", "343 Hk", etc.
        cleaned = re.sub(r'\s+\d+\s*[Hh][Kk].*', '', cleaned).strip()
        
        # Remove any trailing commas or punctuation
        cleaned = re.sub(r'[,\s]+$', '', cleaned).strip()
        
        print(f"Cleaned variant: '{cleaned}'")
        
        if cleaned != variant:
            print(f"✅ Cleaning applied successfully")
        else:
            print(f"✅ No cleaning needed (already clean)")

if __name__ == '__main__':
    test_problematic_bz4x()
    test_variant_cleaning()