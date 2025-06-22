#!/usr/bin/env python3
"""
Standalone test script for unique variant ID generation system
(Without pdfplumber dependency)
"""

import re
from typing import Optional, Dict, Any, List

# Copy helper functions for standalone testing
def extract_power_from_specification(engine_spec: str) -> Optional[int]:
    """Extract horsepower from engine specification"""
    if not engine_spec:
        return None
    
    # Pattern for horsepower: "343 hk", "167 hp", etc.
    power_pattern = r'(\d+)\s*(?:hk|hp)'
    match = re.search(power_pattern, engine_spec, re.IGNORECASE)
    
    return int(match.group(1)) if match else None

def normalize_drivetrain(engine_spec: str, drivetrain_field: Optional[str]) -> str:
    """Normalize drivetrain information"""
    
    if drivetrain_field:
        return drivetrain_field.lower()
    
    if not engine_spec:
        return 'fwd'
    
    # Extract from engine specification
    engine_lower = engine_spec.lower()
    
    if 'awd' in engine_lower:
        return 'awd'
    elif 'automatgear' in engine_lower:
        return 'auto'
    elif 'manual' in engine_lower:
        return 'manual'
    elif 'hybrid' in engine_lower:
        return 'hybrid'
    elif 'elbil' in engine_lower or 'kwh' in engine_lower:
        return 'electric'
    
    return 'fwd'  # Default for most cars

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

def generate_unique_variant_id(model: str, variant: str, engine_specification: str, drivetrain: Optional[str] = None) -> str:
    """
    Generate unique identifier for each variant configuration
    
    Args:
        model: str - "BZ4X", "YARIS", etc.
        variant: str - "Active", "Executive", etc.
        engine_specification: str - "73.1 kWh, 343 hk AWD"
        drivetrain: str - "FWD", "AWD", "manual", "automatic"
    
    Returns:
        str - unique identifier like "bz4x_active_343hp_awd"
    """
    
    # Extract power from engine specification
    power_hp = extract_power_from_specification(engine_specification)
    
    # Extract drivetrain info
    drivetrain_code = normalize_drivetrain(engine_specification, drivetrain)
    
    # Create base ID
    base_id = f"{model.lower().replace(' ', '').replace('-', '')}_{variant.lower().replace(' ', '_')}"
    
    # Add differentiators
    if power_hp:
        base_id += f"_{power_hp}hp"
    
    # Add drivetrain/transmission - prioritize specific info over generic
    if 'awd' in drivetrain_code:
        base_id += "_awd"
    elif drivetrain_code in ['auto', 'manual']:
        base_id += f"_{drivetrain_code}"
    elif drivetrain_code in ['electric', 'hybrid']:
        # For electric/hybrid, only add if it's not the default
        base_id += f"_{drivetrain_code}"
    # For gasoline with manual transmission, check if we need to add manual
    elif categorize_powertrain(engine_specification) == 'gasoline':
        transmission_code = extract_transmission_code(engine_specification)
        if transmission_code:
            base_id += f"_{transmission_code}"
    # Skip adding 'fwd' as it's the default for most cars
    
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

# Test functions (same as before)
def test_unique_id_generation():
    """Test that similar variants get unique IDs"""
    
    test_cases = [
        {
            'model': 'BZ4X',
            'variant': 'Active', 
            'engine_spec': '57.7 KWh 167 hk',
            'expected_id': 'bz4x_active_167hp_electric'
        },
        {
            'model': 'BZ4X',
            'variant': 'Active',
            'engine_spec': '73.1 kWh, 224 hk', 
            'expected_id': 'bz4x_active_224hp_electric'
        },
        {
            'model': 'BZ4X',
            'variant': 'Active',
            'engine_spec': '73.1 kWh, 343 hk AWD',
            'expected_id': 'bz4x_active_343hp_awd'
        },
        {
            'model': 'AYGO X',
            'variant': 'Active',
            'engine_spec': '1.0 benzin 72 hk',
            'expected_id': 'aygox_active_72hp_manual'
        },
        {
            'model': 'YARIS',
            'variant': 'Style Comfort',
            'engine_spec': '1.5 Hybrid 116 hk automatgear',
            'expected_id': 'yaris_style_comfort_116hp_auto'
        },
        {
            'model': 'COROLLA',
            'variant': 'Executive',
            'engine_spec': '2.0 Hybrid 184 hk',
            'expected_id': 'corolla_executive_184hp_hybrid'
        }
    ]
    
    print("🧪 Testing Unique ID Generation")
    print("=" * 50)
    
    all_passed = True
    
    for i, case in enumerate(test_cases, 1):
        print(f"\nTest {i}: {case['model']} {case['variant']}")
        print(f"  Engine: {case['engine_spec']}")
        
        generated_id = generate_unique_variant_id(
            case['model'], 
            case['variant'], 
            case['engine_spec']
        )
        
        expected = case['expected_id']
        passed = generated_id == expected
        
        print(f"  Expected: {expected}")
        print(f"  Generated: {generated_id}")
        print(f"  Result: {'✅ PASS' if passed else '❌ FAIL'}")
        
        if not passed:
            all_passed = False
    
    return all_passed

def test_bz4x_variants():
    """Test the specific BZ4X Active variants that were problematic"""
    
    bz4x_variants = [
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'BZ4X',
            'variant': 'Active',
            'engine_specification': '57.7 KWh 167 hk',
            'monthly_price': 3999,
            'expected_id': 'bz4x_active_167hp_electric'
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'BZ4X',
            'variant': 'Active',
            'engine_specification': '73.1 kWh, 224 hk',
            'monthly_price': 4499,
            'expected_id': 'bz4x_active_224hp_electric'
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'BZ4X',
            'variant': 'Active',
            'engine_specification': '73.1 kWh, 343 hk AWD',
            'monthly_price': 4799,
            'expected_id': 'bz4x_active_343hp_awd'
        }
    ]
    
    print("\n🚗 Testing BZ4X Active Variants (The Core Problem)")
    print("=" * 60)
    
    enhanced_variants = []
    all_passed = True
    
    for i, variant in enumerate(bz4x_variants, 1):
        print(f"\nBZ4X Active Variant {i}:")
        print(f"  Engine: {variant['engine_specification']}")
        print(f"  Monthly Price: {variant['monthly_price']} DKK")
        
        enhanced = enhance_variant_with_unique_id(variant)
        enhanced_variants.append(enhanced)
        
        generated_id = enhanced['id']
        expected_id = variant['expected_id']
        passed = generated_id == expected_id
        
        print(f"  Generated ID: {generated_id}")
        print(f"  Expected ID: {expected_id}")
        print(f"  Power HP: {enhanced['power_hp']}")
        print(f"  Battery: {enhanced['battery_capacity_kwh']} kWh")
        print(f"  Drivetrain: {enhanced['drivetrain_type']}")
        print(f"  Category: {enhanced['powertrain_category']}")
        print(f"  Result: {'✅ PASS' if passed else '❌ FAIL'}")
        
        if not passed:
            all_passed = False
    
    # Test uniqueness validation
    print(f"\n🔍 Testing Uniqueness Validation:")
    try:
        validate_unique_variants(enhanced_variants)
        print("  All BZ4X Active variants have unique IDs: ✅ PASS")
    except ValueError as e:
        print(f"  Uniqueness validation failed: ❌ FAIL - {e}")
        all_passed = False
    
    # Show the unique IDs generated
    unique_ids = [v['id'] for v in enhanced_variants]
    print(f"\n📋 Generated Unique IDs:")
    for id_val in unique_ids:
        print(f"  - {id_val}")
    
    return all_passed

def test_all_scenarios():
    """Test various Toyota model scenarios"""
    
    scenarios = [
        # Electric vehicles
        {'model': 'BZ4X', 'variant': 'Executive', 'engine_specification': '73.1 kWh, 343 hk AWD'},
        
        # Hybrid vehicles
        {'model': 'YARIS', 'variant': 'Active', 'engine_specification': '1.5 Hybrid 116 hk'},
        {'model': 'COROLLA', 'variant': 'Style', 'engine_specification': '2.0 Hybrid 184 hk automatgear'},
        
        # Gasoline vehicles
        {'model': 'AYGO X', 'variant': 'Active', 'engine_specification': '1.0 benzin 72 hk'},
        {'model': 'YARIS', 'variant': 'Style', 'engine_specification': '1.0 benzin 72 hk'},
        
        # Complex names
        {'model': 'COROLLA TOURING SPORTS', 'variant': 'Style Comfort', 'engine_specification': '2.0 Hybrid 184 hk'},
        {'model': 'YARIS CROSS', 'variant': 'Active Technology', 'engine_specification': '1.5 Hybrid 130 hk'}
    ]
    
    print("\n🌟 Testing All Toyota Scenarios")
    print("=" * 60)
    
    enhanced_variants = []
    all_passed = True
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\nScenario {i}: {scenario['model']} {scenario['variant']}")
        
        enhanced = enhance_variant_with_unique_id({
            'type': 'car_model',
            'make': 'Toyota',
            'monthly_price': 3000,  # Dummy price
            **scenario
        })
        
        enhanced_variants.append(enhanced)
        
        print(f"  ID: {enhanced['id']}")
        print(f"  Power: {enhanced['power_hp']} hp")
        print(f"  Drivetrain: {enhanced['drivetrain_type']}")
        print(f"  Category: {enhanced['powertrain_category']}")
        
        if enhanced['powertrain_category'] == 'electric' and enhanced['battery_capacity_kwh']:
            print(f"  Battery: {enhanced['battery_capacity_kwh']} kWh")
    
    # Test overall uniqueness
    print(f"\n🔍 Testing Overall Uniqueness:")
    try:
        validate_unique_variants(enhanced_variants)
        all_ids_unique = len(set(v['id'] for v in enhanced_variants)) == len(enhanced_variants)
        print(f"  All {len(enhanced_variants)} variants have unique IDs: {'✅ PASS' if all_ids_unique else '❌ FAIL'}")
        
        if not all_ids_unique:
            # Show duplicates
            from collections import Counter
            id_counts = Counter(v['id'] for v in enhanced_variants)
            duplicates = {id_val: count for id_val, count in id_counts.items() if count > 1}
            if duplicates:
                print(f"  Duplicates found: {duplicates}")
            all_passed = False
    except ValueError as e:
        print(f"  Uniqueness validation failed: ❌ FAIL - {e}")
        all_passed = False
    
    return all_passed

def main():
    """Run all tests"""
    
    print("🧪 Toyota PDF Extraction - Unique Variant ID Tests")
    print("=" * 60)
    
    tests = [
        ("Unique ID Generation", test_unique_id_generation),
        ("BZ4X Active Variants", test_bz4x_variants),
        ("All Toyota Scenarios", test_all_scenarios)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            print(f"\n🎯 Running: {test_name}")
            result = test_func()
            results.append(result)
            print(f"{'✅ PASSED' if result else '❌ FAILED'}")
        except Exception as e:
            print(f"\n❌ Test {test_name} failed with error: {e}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Tests passed: {passed}/{total}")
    print(f"Success rate: {passed/total*100:.1f}%")
    
    if passed == total:
        print("\n🎉 All tests passed! Unique variant ID system is working correctly.")
        print("\n🚀 Ready for deployment to Railway!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} tests failed. Please review the implementation.")
        return 1

if __name__ == '__main__':
    exit(main())