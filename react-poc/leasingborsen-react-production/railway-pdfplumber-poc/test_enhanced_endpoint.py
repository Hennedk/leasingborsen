#!/usr/bin/env python3
"""
Test Enhanced Toyota Extraction Endpoint

This script tests the enhanced extraction system to ensure it produces 27 variants.
"""

import json
import sys
from toyota_variant_extraction_fixes_enhanced import ToyotaVariantExtractor

def test_enhanced_extraction():
    """Test the enhanced extraction system with sample data"""
    print("🔧 Testing Enhanced Toyota Extraction System")
    print("=" * 50)
    
    try:
        # Initialize enhanced extractor
        extractor = ToyotaVariantExtractor()
        print("✅ ToyotaVariantExtractor initialized")
        
        # Load sample basic extraction results (like what comes from basic template)
        sample_basic_items = [
            # AYGO X - Should become 4 variants (2 manual + 2 automatic)
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
            # YARIS CROSS - Should become 6 variants (standard + high-power)
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
            # BZ4X - Should become 7 variants (4 FWD + 3 AWD)
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
        
        # Apply enhanced processing
        enhanced_items = extractor.process_all_variants(sample_basic_items)
        print(f"✨ Enhanced extraction items: {len(enhanced_items)}")
        
        # Validate results
        validation = extractor.validate_extraction_results(enhanced_items)
        print(f"🎯 Total variants found: {validation['total_variants']}")
        print(f"🎯 Expected variants: {validation['expected_total']}")
        print(f"✅ Validation passed: {validation['validation_passed']}")
        
        # Show statistics
        stats = extractor.get_statistics()
        print(f"\n📈 Enhanced Processing Statistics:")
        print(f"   Total processed: {stats.total_processed}")
        print(f"   AYGO X manual found: {stats.aygo_x_manual_found}")
        print(f"   AYGO X automatic found: {stats.aygo_x_auto_found}")
        print(f"   BZ4X AWD found: {stats.bz4x_awd_found}")
        print(f"   YARIS CROSS high-power found: {stats.yaris_cross_high_power_found}")
        print(f"   Errors encountered: {stats.errors_encountered}")
        
        # Show model breakdown
        print(f"\n🚗 Model Breakdown:")
        model_counts = {}
        for item in enhanced_items:
            model = item.get('model', 'Unknown')
            if model not in model_counts:
                model_counts[model] = []
            model_counts[model].append(item.get('variant', ''))
        
        for model, variants in model_counts.items():
            print(f"   {model}: {len(variants)} variants")
            for variant in variants[:3]:  # Show first 3
                print(f"     - {variant}")
            if len(variants) > 3:
                print(f"     ... and {len(variants) - 3} more")
        
        # Success check
        if len(enhanced_items) == 27:
            print(f"\n🎉 SUCCESS: Enhanced extraction produces exactly 27 variants!")
            return True
        else:
            print(f"\n❌ ISSUE: Expected 27 variants, got {len(enhanced_items)}")
            if validation.get('missing_variants'):
                print("Missing variants:")
                for missing in validation['missing_variants']:
                    print(f"   {missing['model']}: expected {missing['expected']}, got {missing['actual']}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing enhanced extraction: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_enhanced_extraction()
    sys.exit(0 if success else 1)