# Toyota Enhanced Variant Extraction - Integration Guide

This guide provides step-by-step instructions for integrating the enhanced Toyota variant extraction system into the main extraction pipeline.

## Overview

The enhanced system addresses three critical issues:
1. **AYGO X variants** - Manual vs automatic transmission detection
2. **BZ4X AWD variants** - All-wheel drive preservation during deduplication
3. **YARIS CROSS high-power variants** - Elegant and GR Sport variant extraction

## Files Created

### Core Module
- `toyota_variant_extraction_fixes_enhanced.py` - Main extraction enhancement module
- `toyota_patterns_config.json` - Configuration file for extraction patterns
- `test_toyota_extraction.py` - Comprehensive test suite

### Integration Files
- `integration_guide_enhanced.md` - This integration guide
- `toyota_fixes_enhanced.txt` - Implementation notes and fixes

## Integration Steps

### Step 1: Install Dependencies

Ensure all required Python packages are available:

```bash
# No additional dependencies required - uses standard library only
python3 -c "import re, json, logging, dataclasses, enum, pathlib; print('All dependencies available')"
```

### Step 2: Update Main Extraction File

Modify `extract_with_template.py` to integrate the enhanced extraction:

```python
# Add import at the top of extract_with_template.py
from toyota_variant_extraction_fixes_enhanced import ToyotaVariantExtractor

class ToyotaDanishExtractor:
    def __init__(self, config_path: str):
        # ... existing initialization ...
        
        # Add enhanced extractor
        self.enhanced_extractor = ToyotaVariantExtractor()
        
    def _post_process_items(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enhanced post-processing with variant extraction fixes"""
        
        # Apply existing standardization
        processed_items = []
        for item in items:
            item = self._standardize_model_name(item)
            item = self._standardize_variant_name(item)
            item = self._normalize_prices(item)
            item = self.enhance_variant_with_unique_id(item)
            processed_items.append(item)
        
        # Apply enhanced variant extraction fixes
        processed_items = self.enhanced_extractor.process_all_variants(processed_items)
        
        # Log extraction statistics
        stats = self.enhanced_extractor.get_statistics()
        print(f"Enhanced extraction stats:")
        print(f"  AYGO X manual: {stats.aygo_x_manual_found}")
        print(f"  AYGO X automatic: {stats.aygo_x_auto_found}")  
        print(f"  BZ4X AWD: {stats.bz4x_awd_found}")
        print(f"  YARIS CROSS high-power: {stats.yaris_cross_high_power_found}")
        
        # Validate results
        validation = self.enhanced_extractor.validate_extraction_results(processed_items)
        if not validation["validation_passed"]:
            print(f"⚠️ Validation warning: Expected 27 variants, got {validation['total_variants']}")
            for missing in validation["missing_variants"]:
                print(f"  Missing {missing['missing']} {missing['model']} variants")
        
        return processed_items
    
    def _remove_duplicates(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enhanced duplicate removal that preserves transmission/drivetrain differences"""
        
        # Use enhanced duplicate removal from the extractor
        if hasattr(self, 'enhanced_extractor'):
            return self.enhanced_extractor.enhanced_duplicate_removal(items)
        
        # Fallback to original implementation
        return self._original_remove_duplicates(items)
```

## Expected Output After Integration

After successful integration, the extraction should produce exactly **27 unique Toyota variants**:

### AYGO X (4 variants)
- Active manual 1.0 benzin 72 hk
- Active 1.0 benzin 72 hk automatgear  
- Pulse manual 1.0 benzin 72 hk
- Pulse 1.0 benzin 72 hk automatgear

### YARIS (4 variants)
- Active 1.5 Hybrid 116 hk
- Style 1.5 Hybrid 116 hk
- Style Comfort 1.5 Hybrid 116 hk
- Style Technology 1.5 Hybrid 116 hk

### YARIS CROSS (6 variants)
- Active 1.5 Hybrid 116 hk automatgear
- Active Safety 1.5 Hybrid 116 hk automatgear
- Style Comfort 1.5 Hybrid 116 hk automatgear
- Style Safety 1.5 Hybrid 116 hk automatgear
- Elegant 1.8 Hybrid 140 hk automatgear
- GR Sport 1.5 Hybrid 130 hk automatgear

### COROLLA TOURING SPORTS (4 variants)
- Active Comfort 1.8 Hybrid 140 hk
- Active Comfort Plus 1.8 Hybrid 140 hk
- Style 1.8 Hybrid 140 hk
- Style Safety 1.8 Hybrid 140 hk

### BZ4X (6 variants)
- Active 57.7 kWh, 167 hk (FWD)
- Executive 73.1 kWh, 224 hk (FWD)
- Executive Panorama 73.1 kWh, 224 hk (FWD)
- Active 57.7 kWh, 167 hk AWD
- Executive 73.1 kWh, 343 hk AWD
- Executive Panorama 73.1 kWh, 343 hk AWD

### URBAN CRUISER (3 variants)
- Active 61.1 kWh, 174 hk
- Executive 61.1 kWh, 174 hk
- Executive Comfort 61.1 kWh, 174 hk

## Deployment Checklist

- [ ] Enhanced extractor module deployed
- [ ] Configuration file in correct location
- [ ] Main extraction code updated with integration
- [ ] Tests passing (unit + integration)
- [ ] Logging configured and working
- [ ] Statistics monitoring enabled
- [ ] Performance benchmarks acceptable
- [ ] Validation rules checking correctly
- [ ] Error handling tested with malformed data