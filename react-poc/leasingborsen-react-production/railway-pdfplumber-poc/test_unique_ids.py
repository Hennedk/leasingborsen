#!/usr/bin/env python3
"""
Test script for unique variant ID generation system
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from extract_with_template import (
    generate_unique_variant_id,
    extract_power_from_specification, 
    normalize_drivetrain,
    categorize_powertrain,
    extract_battery_capacity,
    enhance_variant_with_unique_id,
    validate_unique_variants
)

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

def test_power_extraction():
    """Test power extraction from engine specifications"""
    
    test_cases = [
        ('57.7 KWh 167 hk', 167),
        ('73.1 kWh, 224 hk', 224),
        ('73.1 kWh, 343 hk AWD', 343),
        ('1.0 benzin 72 hk', 72),
        ('1.5 Hybrid 116 hk automatgear', 116),
        ('2.0 Hybrid 184 hk', 184),
        ('no power spec', None)
    ]
    
    print("\n🔋 Testing Power Extraction")
    print("=" * 50)
    
    all_passed = True
    
    for spec, expected in test_cases:
        result = extract_power_from_specification(spec)
        passed = result == expected
        
        print(f"  '{spec}' → {result} (expected: {expected}) {'✅' if passed else '❌'}")
        
        if not passed:
            all_passed = False
    
    return all_passed

def test_drivetrain_detection():
    """Test drivetrain detection from engine specifications"""
    
    test_cases = [
        ('73.1 kWh, 343 hk AWD', 'awd'),
        ('57.7 KWh 167 hk', 'electric'),
        ('1.0 benzin 72 hk', 'fwd'),
        ('1.5 Hybrid 116 hk automatgear', 'auto'),
        ('2.0 Hybrid 184 hk', 'hybrid')
    ]
    
    print("\n🚗 Testing Drivetrain Detection")
    print("=" * 50)
    
    all_passed = True
    
    for spec, expected in test_cases:
        result = normalize_drivetrain(spec, None)
        passed = result == expected
        
        print(f"  '{spec}' → {result} (expected: {expected}) {'✅' if passed else '❌'}")
        
        if not passed:
            all_passed = False
    
    return all_passed

def test_powertrain_categorization():
    """Test powertrain category detection"""
    
    test_cases = [
        ('73.1 kWh, 343 hk AWD', 'electric'),
        ('57.7 KWh 167 hk', 'electric'),
        ('1.0 benzin 72 hk', 'gasoline'),
        ('1.5 Hybrid 116 hk automatgear', 'hybrid'),
        ('2.0 Hybrid 184 hk', 'hybrid')
    ]
    
    print("\n⚡ Testing Powertrain Categorization")
    print("=" * 50)
    
    all_passed = True
    
    for spec, expected in test_cases:
        result = categorize_powertrain(spec)
        passed = result == expected
        
        print(f"  '{spec}' → {result} (expected: {expected}) {'✅' if passed else '❌'}")
        
        if not passed:
            all_passed = False
    
    return all_passed

def test_battery_capacity_extraction():
    """Test battery capacity extraction for electric vehicles"""
    
    test_cases = [
        ('73.1 kWh, 343 hk AWD', 73.1),
        ('57.7 KWh 167 hk', 57.7),
        ('57,7 kWh 167 hk', 57.7),  # Danish decimal format
        ('1.0 benzin 72 hk', None),  # Non-electric
        ('1.5 Hybrid 116 hk', None)  # Hybrid without battery spec
    ]
    
    print("\n🔋 Testing Battery Capacity Extraction")
    print("=" * 50)
    
    all_passed = True
    
    for spec, expected in test_cases:
        result = extract_battery_capacity(spec)
        passed = result == expected
        
        print(f"  '{spec}' → {result} (expected: {expected}) {'✅' if passed else '❌'}")
        
        if not passed:
            all_passed = False
    
    return all_passed

def test_variant_enhancement():
    """Test full variant enhancement with unique ID"""
    
    test_variant = {
        'type': 'car_model',
        'make': 'Toyota',
        'model': 'BZ4X',
        'variant': 'Active',
        'engine_specification': '73.1 kWh, 343 hk AWD',
        'monthly_price': 4799,
        'first_payment': 9999,
        'total_cost': 182763
    }
    
    print("\n🚀 Testing Variant Enhancement")
    print("=" * 50)
    
    enhanced = enhance_variant_with_unique_id(test_variant)
    
    expected_fields = {
        'id': 'bz4x_active_343hp_awd',
        'composite_key': 'BZ4X_Active_bz4x_active_343hp_awd',
        'power_hp': 343,
        'battery_capacity_kwh': 73.1,
        'drivetrain_type': 'awd',
        'powertrain_category': 'electric'
    }
    
    all_passed = True
    
    for field, expected_value in expected_fields.items():
        actual_value = enhanced.get(field)
        passed = actual_value == expected_value
        
        print(f"  {field}: {actual_value} (expected: {expected_value}) {'✅' if passed else '❌'}")
        
        if not passed:
            all_passed = False
    
    # Check that original fields are preserved
    original_preserved = all(enhanced.get(key) == value for key, value in test_variant.items())
    print(f"  Original fields preserved: {'✅' if original_preserved else '❌'}")
    
    if not original_preserved:
        all_passed = False
    
    return all_passed

def test_uniqueness_validation():
    """Test validation of unique variant IDs"""
    
    print("\n✅ Testing Uniqueness Validation")
    print("=" * 50)
    
    # Test with unique variants
    unique_variants = [
        {'id': 'bz4x_active_167hp_electric', 'make': 'Toyota', 'model': 'BZ4X', 'variant': 'Active', 'monthly_price': 3999},
        {'id': 'bz4x_active_224hp_electric', 'make': 'Toyota', 'model': 'BZ4X', 'variant': 'Active', 'monthly_price': 4499},
        {'id': 'bz4x_active_343hp_awd', 'make': 'Toyota', 'model': 'BZ4X', 'variant': 'Active', 'monthly_price': 4799}
    ]
    
    try:
        validate_unique_variants(unique_variants)
        print("  Unique variants validation: ✅ PASS")
        unique_test_passed = True
    except ValueError as e:
        print(f"  Unique variants validation: ❌ FAIL - {e}")
        unique_test_passed = False
    
    # Test with duplicate IDs
    duplicate_variants = [
        {'id': 'bz4x_active_343hp_awd', 'make': 'Toyota', 'model': 'BZ4X', 'variant': 'Active', 'monthly_price': 4799},
        {'id': 'bz4x_active_343hp_awd', 'make': 'Toyota', 'model': 'BZ4X', 'variant': 'Active', 'monthly_price': 4799}  # Duplicate
    ]
    
    try:
        validate_unique_variants(duplicate_variants)
        print("  Duplicate detection: ❌ FAIL - Should have detected duplicates")
        duplicate_test_passed = False
    except ValueError as e:
        print("  Duplicate detection: ✅ PASS - Correctly detected duplicates")
        duplicate_test_passed = True
    
    return unique_test_passed and duplicate_test_passed

def main():
    """Run all tests"""
    
    print("🧪 Toyota PDF Extraction - Unique Variant ID Tests")
    print("=" * 60)
    
    tests = [
        test_unique_id_generation,
        test_power_extraction,
        test_drivetrain_detection,
        test_powertrain_categorization,
        test_battery_capacity_extraction,
        test_variant_enhancement,
        test_uniqueness_validation
    ]
    
    results = []
    
    for test_func in tests:
        try:
            result = test_func()
            results.append(result)
        except Exception as e:
            print(f"\n❌ Test {test_func.__name__} failed with error: {e}")
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
        return 0
    else:
        print(f"\n⚠️  {total - passed} tests failed. Please review the implementation.")
        return 1

if __name__ == '__main__':
    exit(main())