# Force Railway Deployment - Toyota Fix

## 🔴 Current Status
- **Service is running BUT with OLD code**
- **Variant names don't have Auto/Manual suffix**
- **Duplicate IDs still present**

## 🚀 Option 1: Railway CLI Force Deploy
```bash
# 1. Make a trivial change to force redeploy
echo "# Updated $(date)" >> README.md
git add README.md
git commit -m "Force redeploy"

# 2. Deploy again
railway up

# 3. Or try with explicit service
railway up --service leasingborsen
```

## 🚀 Option 2: Railway Dashboard
1. Go to Railway dashboard
2. Find your service (leasingborsen)
3. Look for **"Redeploy"** or **"Restart"** button
4. Click to force a new deployment

## 🚀 Option 3: Manual File Update in Railway
If Railway has a file editor:
1. Open `extract_with_template.py` 
2. Find line ~975 in `_standardize_variant_name` method
3. Make sure this code is present:

```python
# CRITICAL FIX: Add transmission to variant name to distinguish variants
if "variant" in item and "engine_specification" in item:
    variant = item["variant"]
    engine_spec = item["engine_specification"].lower()
    
    # Add transmission suffix to variant name for gasoline engines
    if "benzin" in engine_spec:
        if "automatgear" in engine_spec:
            # Only add "Auto" if not already in variant name
            if "auto" not in variant.lower():
                variant = f"{variant} Auto"
        else:
            # Manual transmission (no automatgear mentioned)
            if "manual" not in variant.lower():
                variant = f"{variant} Manual"
    
    item["variant"] = variant
```

## 🎯 Expected Results After Fix
- Variant names will show: "Active Auto", "Pulse Manual", etc.
- Duplicate IDs will disappear
- Each variant will have unique ID based on transmission

## 🔍 How to Verify Success
Upload Toyota PDF and check:
- ✅ `variant: "Active Auto"` (not just "Active")
- ✅ `variant: "Pulse Auto"` (not just "Pulse")
- ✅ No duplicate ID errors