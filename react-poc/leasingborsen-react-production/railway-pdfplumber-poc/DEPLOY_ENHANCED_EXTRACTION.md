# Deploy Enhanced Toyota Extraction to Railway

## Overview
The admin/toyota-pdf interface is currently using basic extraction (21 variants) instead of enhanced extraction (27 variants). This guide deploys the enhanced system.

## Problem
- **Current**: Basic extraction produces 21 variants
- **Expected**: Enhanced extraction produces 27 variants
- **Root Cause**: Railway service not using enhanced extraction system

## Solution
Updated `/extract/template` endpoint to use enhanced Toyota variant extraction system.

## Files Modified

### 1. `app.py` - Enhanced Extraction Integration
```python
# New approach: Use enhanced system directly without API wrapper
from toyota_variant_extraction_fixes_enhanced import ToyotaVariantExtractor

# Apply enhanced processing to basic extraction results
extractor = ToyotaVariantExtractor()
enhanced_items = extractor.process_all_variants(basic_result["items"])
```

### 2. Required Files for Enhanced Extraction
- ✅ `toyota_variant_extraction_fixes_enhanced.py` (599 lines)
- ✅ `toyota_patterns_config.json` (168 lines)
- ✅ `toyota-template-config.json` (basic extraction template)

## Deployment Steps

### Step 1: Verify Local Files
```bash
cd railway-pdfplumber-poc

# Check required files exist
ls -la toyota_variant_extraction_fixes_enhanced.py
ls -la toyota_patterns_config.json
ls -la toyota-template-config.json

# Test enhanced extraction locally
python3 -c "from toyota_variant_extraction_fixes_enhanced import ToyotaVariantExtractor; print('✅ Enhanced system ready')"
```

### Step 2: Deploy to Railway
```bash
# Push updated code to Railway
railway deploy

# Or if using git deployment:
git add .
git commit -m "feat: integrate enhanced Toyota extraction system directly

- Update /extract/template endpoint to use ToyotaVariantExtractor
- Process basic extraction results through enhanced system
- Achieve 27 unique Toyota variants as expected
- Add transmission detection, AWD preservation, power classification"
git push origin main
```

### Step 3: Verify Deployment
```bash
# Test the deployed endpoint
curl -X POST https://your-railway-app.railway.app/extract/template \
  -F "file=@your-toyota-pdf.pdf"

# Look for:
# - "template_version": "Enhanced v2.0"
# - "extraction_method": "enhanced_toyota_extraction"
# - "enhanced_features_active": true
# - "items_extracted": 27
```

## Expected Results After Deployment

### Admin Interface Changes
- **Template Version**: "Enhanced v2.0" (instead of "Basic v1.0")
- **Extraction Method**: "enhanced_toyota_extraction"
- **Badge**: Green "Enhanced ✓" badge
- **Variants**: 27 unique variants (instead of 21)

### Enhanced Features Active
- ✅ **AYGO X**: 4 variants (2 manual + 2 automatic)
- ✅ **BZ4X**: 7 variants (4 FWD + 3 AWD)
- ✅ **YARIS CROSS**: 6 variants (4 standard + 2 high-power)
- ✅ **Transmission Detection**: Manual vs automatic properly identified
- ✅ **Drivetrain Detection**: FWD vs AWD preserved
- ✅ **Power Classification**: High-power variants detected

### Sample Enhanced Variants
```json
{
  "model": "AYGO X",
  "variant": "Active manual 1.0 benzin 72 hk",
  "transmission_type": "manual",
  "extraction_enhanced": true
}
{
  "model": "BZ4X", 
  "variant": "Active",
  "engine_specification": "57.7 kWh, 167 hk",
  "drivetrain_type": "fwd",
  "extraction_enhanced": true
}
```

## Troubleshooting

### If Enhanced System Not Loading
1. **Check imports**: Verify `toyota_variant_extraction_fixes_enhanced.py` is accessible
2. **Check config**: Ensure `toyota_patterns_config.json` exists
3. **Check logs**: Look for "Enhanced extraction not available" or "Enhanced extraction failed"
4. **Fallback behavior**: System will use basic extraction if enhanced fails

### Validation Errors
- **Expected**: 27 total variants
- **AYGO X**: Should have both manual and automatic variants
- **BZ4X**: Should have both FWD and AWD variants
- **YARIS CROSS**: Should include high-power variants

## Monitoring

### Success Indicators
- ✅ Admin interface shows "Enhanced ✓" badge
- ✅ 27 variants extracted from Toyota PDF
- ✅ Statistics show transmission/drivetrain detection
- ✅ No duplicate removal of valid variants

### Error Indicators
- ❌ Only 21 variants extracted
- ❌ "Basic" badge shown
- ❌ Missing manual AYGO X variants
- ❌ Missing AWD BZ4X variants

## Next Steps After Deployment
1. Test with real Toyota PDF through admin interface
2. Verify 27 variants are extracted
3. Check that enhanced features are active
4. Monitor extraction statistics and error rates