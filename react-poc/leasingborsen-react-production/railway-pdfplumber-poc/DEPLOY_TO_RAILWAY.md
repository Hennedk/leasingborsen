# Deploy Toyota Fixes to Railway

## 🚨 Current Status
Railway is still running the old version with duplicate issues. We have 4 commits with fixes that need to be deployed:

1. `b1bfcb1` - Toyota unique variant ID generation fixes
2. `ca35746` - Toyota extraction deduplication fix  
3. `c0f748e` - Refined deduplication to preserve legitimate variants
4. `51bc75f` - Enhanced deduplication with unique ID verification

## 🚀 Railway Deployment Options

### Option 1: Railway CLI (Recommended)
```bash
# If you have Railway CLI installed
railway login
railway deploy
```

### Option 2: Git Push (if authentication is fixed)
```bash
# Fix any git authentication issues first, then:
git push origin main
```

### Option 3: Railway Dashboard Upload
1. Go to your Railway project dashboard
2. Navigate to the file editor
3. Copy the updated files:
   - `extract_with_template.py` (enhanced deduplication + unique ID fixes)
   - `toyota-template-config.json` (updated duplicate removal config)
4. Deploy the changes

### Option 4: Manual File Copy
Copy these key files to Railway:

**extract_with_template.py** - Contains all the critical fixes:
- Enhanced `generate_unique_variant_id()` function (lines 1175-1256)
- Fixed `detect_gasoline_transmission()` function (lines 1297-1318)
- Enhanced `_remove_duplicates()` method (lines 1028-1084)

**toyota-template-config.json** - Updated configuration:
- Line 182: `"match_fields": ["model", "variant", "engine_specification", "monthly_price"]`

## ✅ Expected Results After Deployment

The Toyota PDF extraction should show:
- ✅ **28 unique Toyota variants** (instead of 27)
- ✅ **0 duplicate IDs** (instead of 3 duplicates)
- ✅ **No error messages** about duplicate variant IDs

## 🧪 Test After Deployment

1. Upload the same Toyota PDF via admin interface
2. Check extraction count: Should show "Successfully extracted 28 Toyota variants"
3. Check for errors: Should show no duplicate ID warnings
4. Verify unique IDs in results

## 📋 Deployment Checklist

- [ ] Railway deployment completed
- [ ] Toyota PDF test shows 28 variants
- [ ] No duplicate ID errors
- [ ] All AYGO X variants properly differentiated
- [ ] All BZ4X variants properly differentiated
- [ ] Ready for production use

## 🆘 If Deployment Fails

The critical changes are in these functions in `extract_with_template.py`:

1. **generate_unique_variant_id()** (line 1175) - Fixed unique ID generation
2. **detect_gasoline_transmission()** (line 1297) - Fixed gasoline transmission detection  
3. **_remove_duplicates()** (line 1028) - Enhanced deduplication logic

These functions contain all the logic needed to resolve the duplicate ID issues and achieve 28 unique variants.