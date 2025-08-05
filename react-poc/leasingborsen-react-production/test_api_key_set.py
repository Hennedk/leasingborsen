#!/usr/bin/env python3
"""Test if API4AI_KEY is set in Railway environment"""
import requests
import json

print("Testing if API4AI_KEY is set in Railway...")
print("=" * 50)

# First, let's clear the cache to ensure fresh test
print("\n1. Checking current cache stats:")
response = requests.get("https://leasingborsen-production.up.railway.app/cache/stats")
print(json.dumps(response.json(), indent=2))

# Now test with background removal on a tiny image
print("\n2. Testing background removal (after redeploy with new key):")
test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

# Use a unique filename to bypass cache
import time
unique_filename = f"test_{int(time.time())}.png"

url = "https://leasingborsen-production.up.railway.app/process-image"
payload = {
    "image_base64": test_image,
    "filename": unique_filename,  # Unique to bypass cache
    "options": {
        "remove_background": True,
        "auto_crop": False,
        "add_shadow": False,
        "create_sizes": False
    },
    "mode": "car"
}

response = requests.post(url, json=payload, timeout=30)
data = response.json()

print(f"Success: {data.get('success')}")
print(f"Background removed: {data.get('metadata', {}).get('has_background_removed')}")
print(f"Processing time: {data.get('metadata', {}).get('processing_time_ms')}ms")

if data.get('error'):
    print(f"Error: {data['error']}")

# Check what happened
if data.get('success'):
    processing_time = data.get('metadata', {}).get('processing_time_ms', 0)
    bg_removed = data.get('metadata', {}).get('has_background_removed', False)
    
    print("\n" + "=" * 50)
    print("Diagnosis:")
    
    if processing_time < 100:
        print("❌ Processing too fast - API4.ai was NOT called")
        print("   This suggests the key might not be set")
    elif processing_time > 1000 and not bg_removed:
        print("❌ API4.ai was called but failed")
        print("   The key is set but may be invalid")
        print("   Check Railway logs for the exact error")
    elif processing_time > 1000 and bg_removed:
        print("✅ Success! Background removal is working")
        print("   The API key is properly set and valid")
    else:
        print("🤔 Unexpected result - check Railway logs")