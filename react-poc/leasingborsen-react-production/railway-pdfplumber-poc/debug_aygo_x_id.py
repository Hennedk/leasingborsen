#!/usr/bin/env python3
"""
Debug script to investigate why AYGO X entries are showing "⚠️ NO ID"
"""

import sys
import os
import re
from typing import Optional, Dict, Any, List

# Copy the required functions from extract_with_template.py to avoid pdfplumber dependency

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

def generate_unique_variant_id(model: str, variant: str, engine_specification: str, drivetrain: Optional[str] = None) -> str:
    """
    FIXED: Generate unique identifier for each variant configuration
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

def test_aygo_x_variants():
    """Test AYGO X variants to see if ID generation is working"""
    
    # Example AYGO X variants that might be extracted from PDF
    aygo_x_variants = [
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'AYGO X',
            'variant': 'Active',
            'engine_specification': '1.0 benzin 72 hk',
            'monthly_price': 2699,
            'currency': 'DKK'
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'AYGO X',
            'variant': 'Active',
            'engine_specification': '1.0 benzin 72 hk automatgear',
            'monthly_price': 2899,
            'currency': 'DKK'
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'AYGO X',
            'variant': 'Pulse',
            'engine_specification': '1.0 benzin 72 hk',
            'monthly_price': 2999,
            'currency': 'DKK'
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'AYGO X',
            'variant': 'Pulse',
            'engine_specification': '1.0 benzin 72 hk automatgear',
            'monthly_price': 3199,
            'currency': 'DKK'
        }
    ]
    
    print("🚗 Testing AYGO X ID Generation (Debug)")
    print("=" * 50)
    
    enhanced_variants = []
    
    for i, variant in enumerate(aygo_x_variants, 1):
        print(f"\nAYGO X Variant {i}:")
        print(f"  Variant: {variant['variant']}")
        print(f"  Engine: {variant['engine_specification']}")
        print(f"  Price: {variant['monthly_price']} DKK")
        
        # Test individual ID generation first
        try:
            raw_id = generate_unique_variant_id(
                model=variant['model'],
                variant=variant['variant'],
                engine_specification=variant['engine_specification']
            )
            print(f"  Raw ID Generation: ✅ {raw_id}")
        except Exception as e:
            print(f"  Raw ID Generation: ❌ ERROR - {e}")
            continue
        
        # Test enhancement function
        try:
            enhanced = enhance_variant_with_unique_id(variant)
            enhanced_variants.append(enhanced)
            
            print(f"  Enhanced ID: ✅ {enhanced.get('id', 'MISSING!')}")
            print(f"  Power HP: {enhanced.get('power_hp', 'N/A')}")
            print(f"  Drivetrain: {enhanced.get('drivetrain_type', 'N/A')}")
            print(f"  Category: {enhanced.get('powertrain_category', 'N/A')}")
            
            # Check if 'id' field exists
            if 'id' not in enhanced:
                print(f"  ⚠️ WARNING: 'id' field missing from enhanced variant!")
            elif not enhanced['id']:
                print(f"  ⚠️ WARNING: 'id' field is empty!")
            
        except Exception as e:
            print(f"  Enhancement: ❌ ERROR - {e}")
            import traceback
            traceback.print_exc()
    
    # Test the exact conditions that trigger "⚠️ NO ID"
    print(f"\n🔍 Testing Duplicate Removal Logic (Where NO ID appears):")
    for item in enhanced_variants:
        unique_id = item.get('id', '')
        if unique_id:
            print(f"  ✅ ID EXISTS: {unique_id}")
        else:
            print(f"  ⚠️ NO ID: {item.get('model', '')} {item.get('variant', '')} - This would trigger the warning!")
    
    return enhanced_variants

def test_missing_fields():
    """Test what happens with missing fields that might cause ID generation to fail"""
    
    problematic_variants = [
        # Missing engine_specification
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'AYGO X',
            'variant': 'Active',
            'monthly_price': 2699,
        },
        # Empty engine_specification
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'AYGO X',
            'variant': 'Active',
            'engine_specification': '',
            'monthly_price': 2699,
        },
        # Malformed engine_specification
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'AYGO X',
            'variant': 'Active',
            'engine_specification': 'unknown engine',
            'monthly_price': 2699,
        }
    ]
    
    print(f"\n🔧 Testing Problematic Variants (Missing/Bad Fields):")
    print("=" * 50)
    
    for i, variant in enumerate(problematic_variants, 1):
        print(f"\nProblematic Variant {i}:")
        print(f"  Data: {variant}")
        
        try:
            enhanced = enhance_variant_with_unique_id(variant)
            unique_id = enhanced.get('id', '')
            
            if unique_id:
                print(f"  Result: ✅ ID Generated: {unique_id}")
            else:
                print(f"  Result: ⚠️ NO ID - This would trigger the warning!")
                
        except Exception as e:
            print(f"  Result: ❌ ERROR - {e}")

def main():
    """Run the debug tests"""
    
    print("🔍 AYGO X ID Generation Debug")
    print("=" * 50)
    
    # Test normal variants
    enhanced_variants = test_aygo_x_variants()
    
    # Test edge cases
    test_missing_fields()
    
    # Summary
    print(f"\n📊 Summary:")
    print(f"Enhanced variants created: {len(enhanced_variants)}")
    
    ids_with_values = [v for v in enhanced_variants if v.get('id')]
    ids_without_values = [v for v in enhanced_variants if not v.get('id')]
    
    print(f"Variants with IDs: {len(ids_with_values)}")
    print(f"Variants WITHOUT IDs: {len(ids_without_values)}")
    
    if ids_without_values:
        print(f"\n⚠️ Variants that would show 'NO ID' warning:")
        for v in ids_without_values:
            print(f"  - {v.get('model', '')} {v.get('variant', '')}")
    
    if len(ids_with_values) == len(enhanced_variants):
        print(f"\n✅ All AYGO X variants have IDs - the issue might be elsewhere!")
    else:
        print(f"\n❌ Some AYGO X variants are missing IDs - found the problem!")

if __name__ == '__main__':
    main()