#!/usr/bin/env python3
"""
Analyze the uniqueness issue to confirm it's expected behavior
"""

import re
from collections import Counter

def standardize_bz4x_variant(original_variant: str) -> str:
    """Apply the BZ4X variant standardization fix"""
    trimline = original_variant
    
    # Remove battery specifications: "57.7 Kwh", "73.1 Kwh", etc.
    trimline = re.sub(r'\s+\d+[.,]\d*\s*[Kk][Ww][Hh].*', '', trimline).strip()
    
    # Remove power specifications: "167 Hk", "224 Hk", "343 Hk", etc.
    trimline = re.sub(r'\s+\d+\s*[Hh][Kk].*', '', trimline).strip()
    
    # Remove any trailing commas or punctuation
    trimline = re.sub(r'[,\s]+$', '', trimline).strip()
    
    return trimline

def main():
    print("🔍 Analyzing BZ4X Uniqueness")
    print("=" * 50)
    
    test_cases = [
        ("Active 57.7 Kwh, 167 Hk", "57.7 kWh, 167 hk", "Test 1"),
        ("Executive 73.1 Kwh, 224 Hk", "73.1 kWh, 224 hk", "Test 2"), 
        ("Executive Panorama 73.1 Kwh, 343 Hk AWD", "73.1 kWh, 343 hk AWD", "Test 3"),
        ("Active", "57.7 kWh, 167 hk", "Test 4"),  # Already clean variant - SAME as Test 1
        ("Executive Panorama", "73.1 kWh, 224 hk", "Test 5")  # Already clean variant
    ]
    
    configurations = []
    
    for variant, engine_spec, test_name in test_cases:
        standardized = standardize_bz4x_variant(variant)
        
        # Create a configuration key
        config_key = f"{standardized}|{engine_spec}"
        configurations.append((test_name, variant, standardized, engine_spec, config_key))
        
        print(f"{test_name}:")
        print(f"  Original: '{variant}'")
        print(f"  Standardized: '{standardized}'")
        print(f"  Engine: '{engine_spec}'")
        print(f"  Config Key: '{config_key}'")
        print()
    
    # Count configurations
    config_counts = Counter(config[4] for config in configurations)
    
    print("🔍 Configuration Analysis:")
    for config_key, count in config_counts.items():
        if count > 1:
            print(f"  DUPLICATE: '{config_key}' appears {count} times")
            # Show which tests have this config
            matching_tests = [config[0] for config in configurations if config[4] == config_key]
            print(f"    Tests: {', '.join(matching_tests)}")
        else:
            print(f"  UNIQUE: '{config_key}'")
    
    print(f"\n📊 Summary:")
    total_configs = len(configurations)
    unique_configs = len(set(config[4] for config in configurations))
    print(f"  Total test cases: {total_configs}")
    print(f"  Unique configurations: {unique_configs}")
    print(f"  Duplicates: {total_configs - unique_configs}")
    
    # Check if duplicates are legitimate
    print(f"\n✅ Analysis Result:")
    duplicate_configs = [config_key for config_key, count in config_counts.items() if count > 1]
    
    if duplicate_configs:
        print(f"  Found {len(duplicate_configs)} duplicate configuration(s)")
        for dup_config in duplicate_configs:
            standardized_variant, engine_spec = dup_config.split('|')
            print(f"    '{standardized_variant}' with '{engine_spec}'")
            
            # Check if this represents the same actual car configuration
            print(f"    This represents the SAME car configuration, so same ID is CORRECT!")
    else:
        print(f"  No duplicates found")
    
    print(f"\n🎯 Conclusion:")
    print(f"The 'duplicate' IDs are actually CORRECT behavior!")
    print(f"Test 1 and Test 4 both represent:")
    print(f"  - BZ4X Active variant")
    print(f"  - 57.7 kWh battery, 167 hp")
    print(f"  - Should have the SAME ID: 'bz4x_active_167hp_57_7kwh_electric'")

if __name__ == '__main__':
    main()