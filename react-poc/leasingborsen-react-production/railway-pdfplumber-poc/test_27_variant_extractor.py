#!/usr/bin/env python3
"""
Test the Toyota 27-Variant Extractor
"""

from toyota_27_variant_extractor import Toyota27VariantExtractor

def test_27_variant_extractor():
    """Test the simple 27-variant extractor"""
    print("🔧 Testing Toyota 27-Variant Extractor")
    print("=" * 50)
    
    # Sample basic extraction results (like what comes from the actual PDF)
    sample_basic_items = [
        # AYGO X - 2 base variants
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'AYGO X',
            'variant': 'Active 1.0 Benzin 72 Hk Automatgear',
            'engine_specification': '1.0 benzin 72 hk automatgear',
            'monthly_price': 2995
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'AYGO X',
            'variant': 'Pulse 1.0 Benzin 72 Hk Automatgear',
            'engine_specification': '1.0 benzin 72 hk automatgear',
            'monthly_price': 3195
        },
        # YARIS - 4 variants
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'YARIS',
            'variant': 'Active 1.5 Hybrid 116 Hk',
            'engine_specification': '1.5 Hybrid 116 hk',
            'monthly_price': 2795
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'YARIS',
            'variant': 'Style 1.5 Hybrid 116 Hk',
            'engine_specification': '1.5 Hybrid 116 hk',
            'monthly_price': 2995
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'YARIS',
            'variant': 'Style Comfort 1.5 Hybrid 116 Hk',
            'engine_specification': '1.5 Hybrid 116 hk',
            'monthly_price': 3295
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'YARIS',
            'variant': 'Style Technology 1.5 Hybrid 116 Hk',
            'engine_specification': '1.5 Hybrid 116 hk',
            'monthly_price': 3495
        },
        # YARIS CROSS - 6 variants
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'YARIS CROSS',
            'variant': 'Active 1.5 Hybrid 130 Hk Automatgear',
            'engine_specification': '1.5 Hybrid 130 hk automatgear',
            'monthly_price': 3795
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'YARIS CROSS',
            'variant': 'Active Safety 1.5 Hybrid 130 Hk Automatgear',
            'engine_specification': '1.5 Hybrid 130 hk automatgear',
            'monthly_price': 3995
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'YARIS CROSS',
            'variant': 'Style Comfort 1.5 Hybrid 130 Hk Automatgear',
            'engine_specification': '1.5 Hybrid 130 hk automatgear',
            'monthly_price': 4295
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'YARIS CROSS',
            'variant': 'Style Safety 1.5 Hybrid 130 Hk Automatgear',
            'engine_specification': '1.5 Hybrid 130 hk automatgear',
            'monthly_price': 4495
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'YARIS CROSS',
            'variant': 'Elegant 1.8 Hybrid 140 Hk Automatgear',
            'engine_specification': '1.8 Hybrid 140 hk automatgear',
            'monthly_price': 4795
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'YARIS CROSS',
            'variant': 'Gr Sport 1.5 Hybrid 130 Hk Automatgear',
            'engine_specification': '1.5 Hybrid 130 hk automatgear',
            'monthly_price': 4695
        },
        # COROLLA TOURING SPORTS - 4 variants
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'COROLLA TOURING SPORTS',
            'variant': 'Active Comfort 1.8 Hybrid 140 Hk',
            'engine_specification': '1.8 Hybrid 140 hk',
            'monthly_price': 4195
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'COROLLA TOURING SPORTS',
            'variant': 'Active Comfort Plus 1.8 Hybrid 140 Hk',
            'engine_specification': '1.8 Hybrid 140 hk',
            'monthly_price': 4395
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'COROLLA TOURING SPORTS',
            'variant': 'Style 1.8 Hybrid 140 Hk',
            'engine_specification': '1.8 Hybrid 140 hk',
            'monthly_price': 4595
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'COROLLA TOURING SPORTS',
            'variant': 'Style Safety 1.8 Hybrid 140 Hk',
            'engine_specification': '1.8 Hybrid 140 hk',
            'monthly_price': 4795
        },
        # BZ4X - 3 base variants
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'BZ4X',
            'variant': 'Active',
            'engine_specification': '57.7 kWh, 167 hk',
            'monthly_price': 5995
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'BZ4X',
            'variant': 'Executive',
            'engine_specification': '73.1 kWh, 224 hk',
            'monthly_price': 6495
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'BZ4X',
            'variant': 'Executive Panorama',
            'engine_specification': '73.1 kWh, 224 hk',
            'monthly_price': 6795
        },
        # URBAN CRUISER - 2 variants
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'URBAN CRUISER',
            'variant': 'Active 61.1 Kwh, 174 Hk',
            'engine_specification': '61.1 kWh, 174 hk',
            'monthly_price': 4995
        },
        {
            'type': 'car_model',
            'make': 'Toyota',
            'model': 'URBAN CRUISER',
            'variant': 'Executive 61.1 Kwh, 174 Hk',
            'engine_specification': '61.1 kWh, 174 hk',
            'monthly_price': 5295
        }
    ]
    
    print(f"📊 Basic extraction items: {len(sample_basic_items)}")
    
    # Process with 27-variant extractor
    extractor = Toyota27VariantExtractor()
    enhanced_items = extractor.process_to_27_variants(sample_basic_items)
    
    print(f"✨ Enhanced extraction items: {len(enhanced_items)}")
    
    # Validate results
    validation = extractor.validate_extraction_results(enhanced_items)
    print(f"🎯 Total variants found: {validation['total_variants']}")
    print(f"🎯 Expected variants: {validation['expected_total']}")
    print(f"✅ Validation passed: {validation['validation_passed']}")
    
    # Show model breakdown
    print(f"\n🚗 Model Breakdown:")
    model_counts = validation['models']
    for model, variants in model_counts.items():
        print(f"   {model}: {len(variants)} variants")
        for variant in variants[:3]:  # Show first 3
            print(f"     - {variant}")
        if len(variants) > 3:
            print(f"     ... and {len(variants) - 3} more")
    
    # Success check
    if len(enhanced_items) == 27:
        print(f"\n🎉 SUCCESS: Extractor produces exactly 27 variants!")
        return True
    else:
        print(f"\n❌ ISSUE: Expected 27 variants, got {len(enhanced_items)}")
        return False

if __name__ == "__main__":
    success = test_27_variant_extractor()
    exit(0 if success else 1)