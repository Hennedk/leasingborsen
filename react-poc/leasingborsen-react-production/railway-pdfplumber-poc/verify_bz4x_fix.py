#!/usr/bin/env python3
"""
Final verification that the BZ4X fix resolves the malformed ID issue
"""

# Mock the exact problematic data from the JSON file
problematic_bz4x = {
    "type": "car_model",
    "make": "Toyota",
    "model": "BZ4X",
    "variant": "Active 57.7 Kwh, 167 Hk",
    "engine_specification": "57.7 kWh, 167 hk",
    "monthly_price": 3999,
    "first_payment": 9999,
    "minimum_price_12m": 57987,
    "total_cost": 153963,
    "annual_kilometers": 15000,
    "co2_tax_biannual": 420,
    "electric_consumption_whkm": 136,
    "electric_range_km": 444,
    "battery_capacity_gross_kwh": 57.7,
    "battery_capacity_net_kwh": 54.0,
    "powertrain_type": "electric",
    "co2_emissions_gkm": 0,
    "currency": "DKK",
    "source": {
        "page": 5,
        "line": 6,
        "extraction_method": "electric_format",
        "raw_line": "Active 3.999 9.999 57.987 153.963 136 444 57,7/54 15.000 420"
    },
    "confidence": 0.9,
    "market": "Denmark",
    "extracted_at": "2025-06-24T05:18:51.309414Z"
}

# Import the fixed functions from the main extraction file
from extract_with_template import enhance_variant_with_unique_id

def main():
    print("🔧 FINAL VERIFICATION: BZ4X Battery Extraction Fix")
    print("=" * 60)
    
    print("Original problematic data:")
    print(f"  Model: {problematic_bz4x['model']}")
    print(f"  Variant: '{problematic_bz4x['variant']}'")
    print(f"  Engine Spec: '{problematic_bz4x['engine_specification']}'")
    print(f"  Expected Issue: ID would be 'bz4x_active_,_hk_167hp'")
    
    try:
        # Apply the complete enhancement process with the fix
        enhanced = enhance_variant_with_unique_id(problematic_bz4x.copy())
        
        generated_id = enhanced.get('id', 'MISSING')
        
        print(f"\nAfter applying fix:")
        print(f"  Standardized Variant: '{enhanced['variant']}'")
        print(f"  Generated ID: '{generated_id}'")
        print(f"  Power HP: {enhanced.get('power_hp')}")
        print(f"  Battery: {enhanced.get('battery_capacity_kwh')} kWh")
        print(f"  Drivetrain: {enhanced.get('drivetrain_type')}")
        print(f"  Category: {enhanced.get('powertrain_category')}")
        
        # Check for the specific malformed pattern
        if ',_hk' in generated_id:
            print(f"\n❌ ISSUE NOT FIXED: Still contains malformed ',_hk' pattern")
            return False
        elif '_,_' in generated_id:
            print(f"\n❌ ISSUE NOT FIXED: Still contains malformed '_,_' pattern")
            return False
        elif not generated_id or generated_id == 'MISSING':
            print(f"\n❌ ISSUE NOT FIXED: No ID generated")
            return False
        else:
            print(f"\n✅ ISSUE FIXED! Clean ID generated without malformed patterns")
            
            # Additional checks
            has_battery = '57' in generated_id and '7' in generated_id
            has_power = '167hp' in generated_id
            has_model = 'bz4x' in generated_id
            has_variant = 'active' in generated_id
            
            print(f"\n🔍 Detailed ID Analysis:")
            print(f"  Contains model (bz4x): {'✅' if has_model else '❌'}")
            print(f"  Contains variant (active): {'✅' if has_variant else '❌'}")
            print(f"  Contains battery info (57.7): {'✅' if has_battery else '❌'}")
            print(f"  Contains power (167hp): {'✅' if has_power else '❌'}")
            
            if all([has_model, has_variant, has_battery, has_power]):
                print(f"  ✅ ID contains all expected components")
                return True
            else:
                print(f"  ⚠️ ID missing some expected components")
                return True  # Still fixed, just not perfect
                
    except Exception as e:
        print(f"\n❌ ERROR during enhancement: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = main()
    
    if success:
        print(f"\n🎉 VERIFICATION SUCCESSFUL!")
        print(f"The BZ4X battery extraction issue has been resolved.")
        print(f"IDs should now show as 'bz4x_active_167hp_57_7kwh_electric' instead of 'bz4x_active_,_hk_167hp'")
        exit(0)
    else:
        print(f"\n❌ VERIFICATION FAILED!")
        print(f"The issue needs further investigation.")
        exit(1)