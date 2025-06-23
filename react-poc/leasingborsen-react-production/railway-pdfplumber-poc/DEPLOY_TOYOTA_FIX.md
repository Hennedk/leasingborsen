# Deploy Toyota ID Generation Fix to Railway

## 🎯 Problem Fixed
- **AYGO X duplicates**: Now properly differentiates manual vs automatic transmissions
- **BZ4X Executive Panorama duplicates**: Now properly differentiates power variants
- **Expected result**: 28 unique Toyota variants (up from 27)

## ✅ Changes Made in `extract_with_template.py`

### 1. Enhanced `generate_unique_variant_id()` function (lines 1175-1256)
- Fixed gasoline transmission detection
- Added battery differentiation for electric vehicles
- Enhanced variant name handling

### 2. Added `detect_gasoline_transmission()` function (lines 1294-1315)
- Properly detects manual vs automatic for gasoline engines
- Critical fix for AYGO X variants

### 3. Fixed `normalize_drivetrain()` function (lines 1269-1295)
- Better gasoline manual vs automatic detection
- Consistent with new transmission logic

## 🚀 Deploy to Railway

### Option 1: Git Deployment (Recommended)
```bash
# Navigate to your Railway project directory
cd railway-pdfplumber-poc

# Add and commit the fixes
git add extract_with_template.py
git commit -m "fix: Toyota unique variant ID generation - resolves duplicates for AYGO X and BZ4X Executive Panorama"

# Push to Railway (triggers automatic deployment)
git push origin main
```

### Option 2: Railway CLI Deployment
```bash
# If you have Railway CLI installed
railway deploy
```

### Option 3: File Upload via Railway Dashboard
1. Go to your Railway project dashboard
2. Navigate to the file editor
3. Replace `extract_with_template.py` with the updated version
4. Deploy the changes

## 🧪 Test After Deployment

Upload the same Toyota PDF and verify:

### Expected Results:
✅ **28 unique variants** (instead of 27)  
✅ **No duplicate IDs** warning  
✅ **AYGO X variants properly differentiated:**
- `aygox_active_72hp_manual`
- `aygox_active_72hp_auto` 
- `aygox_pulse_72hp_manual`
- `aygox_pulse_72hp_auto`

✅ **BZ4X Executive Panorama variants differentiated:**
- `bz4x_executive_panorama_224hp_73_1kwh_electric`
- `bz4x_executive_panorama_343hp_awd`

## 📊 Verification Checklist

After deployment, test the Toyota PDF extraction:

1. **Upload Toyota PDF** via admin interface
2. **Check extraction count**: Should show "28 variants extracted"
3. **Check duplicate warning**: Should show "0 duplicate IDs" 
4. **Verify sample variants**: No React key errors in browser console
5. **Download JSON**: Confirm all 28 variants have unique IDs

## 🎉 Success Indicators

- ✅ Extract count: 28 (not 27)
- ✅ No duplicate ID warnings 
- ✅ All AYGO X and BZ4X variants differentiated
- ✅ Clean React rendering without key errors
- ✅ Ready for database import with unique identifiers

## 📞 Support

If deployment issues occur:
1. Check Railway deployment logs
2. Verify all imports work correctly
3. Test with standalone script first: `python3 test_unique_ids_standalone.py`

**Status**: ✅ Ready for deployment - Fix tested and validated