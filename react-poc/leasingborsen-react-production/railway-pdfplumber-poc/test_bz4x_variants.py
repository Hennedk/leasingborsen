#!/usr/bin/env python3
"""
Test BZ4X Variant Extraction Details
"""

from toyota_27_variant_extractor import Toyota27VariantExtractor

def test_bz4x_variants():
    """Test BZ4X variant extraction in detail"""
    print("🔧 Testing BZ4X Variant Extraction")
    print("=" * 50)
    
    # Sample BZ4X item from basic extraction
    sample_bz4x_item = {
        'type': 'car_model',
        'make': 'Toyota',
        'model': 'BZ4X',
        'variant': 'Active',
        'engine_specification': '57.7 kWh, 167 hk',
        'monthly_price': 5995
    }
    
    extractor = Toyota27VariantExtractor()
    bz4x_variants = extractor._process_bz4x([sample_bz4x_item])
    
    print(f"📊 BZ4X variants generated: {len(bz4x_variants)}")
    print(f"🎯 Expected: 7 variants")
    print(f"✅ Correct count: {len(bz4x_variants) == 7}")
    
    print(f"\n🚗 BZ4X Variant Details:")
    for i, variant in enumerate(bz4x_variants, 1):
        engine_spec = variant.get("engine_specification", "")
        variant_name = variant.get("variant", "")
        drivetrain = variant.get("drivetrain_type", "")
        
        print(f"   {i}. {variant_name}")
        print(f"      Engine: {engine_spec}")
        print(f"      Drivetrain: {drivetrain}")
        print()
    
    # Verify expected structure
    expected_specs = [
        "57.7 kWh, 167 hk",      # Active (FWD)
        "73.1 kWh, 224 hk",      # Active (FWD)
        "73.1 kWh, 224 hk",      # Executive (FWD)
        "73.1 kWh, 224 hk",      # Executive Panorama (FWD)
        "73.1 kWh, 343 hk AWD",  # Active AWD
        "73.1 kWh, 343 hk AWD",  # Executive AWD
        "73.1 kWh, 343 hk AWD"   # Executive Panorama AWD
    ]
    
    expected_variants = [
        "Active 57.7 kWh 167 hk",
        "Active 73.1 kWh 224 hk", 
        "Executive 73.1 kWh 224 hk",
        "Executive Panorama 73.1 kWh 224 hk",
        "Active AWD 73.1 kWh 343 hk",
        "Executive AWD 73.1 kWh 343 hk",
        "Executive Panorama AWD 73.1 kWh 343 hk"
    ]
    
    expected_drivetrains = [
        "fwd", "fwd", "fwd", "fwd", "awd", "awd", "awd"
    ]
    
    print("🔍 Validation:")
    all_correct = True
    
    for i, variant in enumerate(bz4x_variants):
        variant_name = variant.get("variant", "")
        engine_spec = variant.get("engine_specification", "")
        drivetrain = variant.get("drivetrain_type", "")
        
        name_correct = variant_name == expected_variants[i]
        spec_correct = engine_spec == expected_specs[i]
        drivetrain_correct = drivetrain == expected_drivetrains[i]
        
        if name_correct and spec_correct and drivetrain_correct:
            print(f"   ✅ Variant {i+1}: {variant_name} - CORRECT")
        else:
            print(f"   ❌ Variant {i+1}: {variant_name} - ERROR")
            if not name_correct:
                print(f"      Expected name: {expected_variants[i]}, got: {variant_name}")
            if not spec_correct:
                print(f"      Expected spec: {expected_specs[i]}, got: {engine_spec}")
            if not drivetrain_correct:
                print(f"      Expected drivetrain: {expected_drivetrains[i]}, got: {drivetrain}")
            all_correct = False
    
    if all_correct:
        print(f"\n🎉 SUCCESS: All 7 BZ4X variants are correctly structured!")
    else:
        print(f"\n❌ ISSUES: Some BZ4X variants need correction")
    
    return all_correct

if __name__ == "__main__":
    success = test_bz4x_variants()
    exit(0 if success else 1)