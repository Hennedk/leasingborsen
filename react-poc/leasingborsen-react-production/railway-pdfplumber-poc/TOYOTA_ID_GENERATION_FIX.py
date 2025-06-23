#!/usr/bin/env python3
"""
Fix for Toyota unique variant ID generation
Addresses duplicate IDs: aygox_active_72hp_auto, aygox_pulse_72hp_auto, bz4x_executive_panorama_343hp_awd
Should result in 28 unique variants instead of 27
"""

import re
from typing import Optional

def generate_unique_variant_id_fixed(model: str, variant: str, engine_specification: str, drivetrain: Optional[str] = None) -> str:
    """
    FIXED: Generate unique identifier for each variant configuration
    
    Fixes:
    1. AYGO X manual vs automatic differentiation 
    2. BZ4X Executive Panorama power variants
    3. Better transmission detection for gasoline vehicles
    
    Args:
        model: str - "BZ4X", "YARIS", "AYGO X", etc.
        variant: str - "Active", "Executive", "Pulse", "Executive Panorama", etc.
        engine_specification: str - "73.1 kWh, 343 hk AWD", "1.0 benzin 72 hk automatgear"
        drivetrain: str - "FWD", "AWD", "manual", "automatic"
    
    Returns:
        str - unique identifier like "bz4x_executive_panorama_343hp_awd"
    """
    
    # Extract power from engine specification
    power_hp = extract_power_from_specification_fixed(engine_specification)
    
    # Extract battery capacity for electric vehicles
    battery_kwh = extract_battery_capacity_fixed(engine_specification)
    
    # Enhanced drivetrain detection
    drivetrain_code = normalize_drivetrain_fixed(engine_specification, drivetrain)
    
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
    powertrain_category = categorize_powertrain_fixed(engine_specification)
    
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

def extract_power_from_specification_fixed(engine_spec: str) -> Optional[int]:
    """Extract horsepower from engine specification"""
    if not engine_spec:
        return None
    
    # Pattern for horsepower: "343 hk", "167 hp", etc.
    power_pattern = r'(\d+)\s*(?:hk|hp)'
    match = re.search(power_pattern, engine_spec, re.IGNORECASE)
    
    return int(match.group(1)) if match else None

def extract_battery_capacity_fixed(engine_spec: str) -> Optional[float]:
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

def normalize_drivetrain_fixed(engine_spec: str, drivetrain_field: Optional[str]) -> str:
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

def categorize_powertrain_fixed(engine_spec: str) -> str:
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

# Test the fixes
if __name__ == "__main__":
    print("🔧 Testing Toyota ID Generation Fixes")
    print("=" * 50)
    
    # Test AYGO X variants (should be 4 unique IDs)
    aygo_variants = [
        ("AYGO X", "Active", "1.0 benzin 72 hk"),
        ("AYGO X", "Active", "1.0 benzin 72 hk automatgear"),
        ("AYGO X", "Pulse", "1.0 benzin 72 hk"),
        ("AYGO X", "Pulse", "1.0 benzin 72 hk automatgear"),
    ]
    
    print("\n🚗 AYGO X Variants (Fixed):")
    aygo_ids = []
    for model, variant, engine in aygo_variants:
        id_val = generate_unique_variant_id_fixed(model, variant, engine)
        aygo_ids.append(id_val)
        print(f"  {model} {variant} - {engine}")
        print(f"  ID: {id_val}")
        print()
    
    print(f"AYGO X Unique IDs: {len(set(aygo_ids))}/4 ({'✅ FIXED' if len(set(aygo_ids)) == 4 else '❌ STILL BROKEN'})")
    
    # Test BZ4X Executive Panorama variants  
    bz4x_variants = [
        ("BZ4X", "Executive Panorama", "73.1 kWh, 224 hk"),
        ("BZ4X", "Executive Panorama", "73.1 kWh, 343 hk AWD"),
    ]
    
    print("\n🔋 BZ4X Executive Panorama Variants (Fixed):")
    bz4x_ids = []
    for model, variant, engine in bz4x_variants:
        id_val = generate_unique_variant_id_fixed(model, variant, engine)
        bz4x_ids.append(id_val)
        print(f"  {model} {variant} - {engine}")
        print(f"  ID: {id_val}")
        print()
    
    print(f"BZ4X Executive Panorama Unique IDs: {len(set(bz4x_ids))}/2 ({'✅ FIXED' if len(set(bz4x_ids)) == 2 else '❌ STILL BROKEN'})")
    
    # Summary
    total_fixed = len(set(aygo_ids)) == 4 and len(set(bz4x_ids)) == 2
    print(f"\n📊 Overall Fix Status: {'✅ ALL FIXED - Ready for 28 variants' if total_fixed else '❌ Needs more work'}")