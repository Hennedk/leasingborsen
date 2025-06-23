#!/usr/bin/env python3
"""
Test the ID generation with the new variant names
"""

def test_id_generation():
    # Simulate the problematic cases
    test_cases = [
        ("AYGO X", "Active Auto", "1.0 benzin 72 hk automatgear"),
        ("AYGO X", "Pulse Auto", "1.0 benzin 72 hk automatgear"),
        ("YARIS", "Style Manual", "1.0 benzin 72 hk"),
    ]
    
    for model, variant, engine_spec in test_cases:
        # Simulate the logic
        model_clean = model.lower().replace(' ', '').replace('-', '')
        variant_clean = variant.lower().replace(' ', '_')
        
        print(f"Model: {model}")
        print(f"Variant: {variant}")
        print(f"Variant Clean: {variant_clean}")
        print(f"Ends with _auto: {variant_clean.endswith('_auto')}")
        print(f"Ends with _manual: {variant_clean.endswith('_manual')}")
        print(f"Should early return: {variant_clean.endswith('_auto') or variant_clean.endswith('_manual')}")
        print("---")

if __name__ == "__main__":
    test_id_generation()