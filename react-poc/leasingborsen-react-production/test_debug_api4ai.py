#!/usr/bin/env python3
"""Debug API4.ai integration by catching and displaying errors"""
import requests
import json

# Test with a real small image
test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

print("Testing Railway image processing with debug info...")
print("=" * 50)

# Make a special request that will show us the error
url = "https://leasingborsen-production.up.railway.app/process-image"
payload = {
    "image_base64": test_image,
    "filename": "debug_test.png",
    "options": {
        "remove_background": True,
        "auto_crop": False,
        "add_shadow": False,
        "create_sizes": False
    },
    "mode": "car"
}

# Since we can't see Railway logs, let's try to trigger different scenarios
print("\n1. Testing with 'car' mode:")
response = requests.post(url, json=payload, timeout=30)
data = response.json()
print(f"Success: {data.get('success')}")
print(f"Background removed: {data.get('metadata', {}).get('has_background_removed')}")
print(f"Processing time: {data.get('metadata', {}).get('processing_time_ms')}ms")

# Try different mode
print("\n2. Testing with 'product' mode:")
payload["mode"] = "product"
response = requests.post(url, json=payload, timeout=30)
data = response.json()
print(f"Success: {data.get('success')}")
print(f"Background removed: {data.get('metadata', {}).get('has_background_removed')}")
print(f"Processing time: {data.get('metadata', {}).get('processing_time_ms')}ms")

# Test with slightly larger image to ensure it's not a size issue
print("\n3. Testing with 10x10 white image:")
# Create a 10x10 white PNG
white_10x10 = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGklEQVQYlWP8////fwYKAOOoQnpbOLoQCAAAW0wCARZJVCoAAAAASUVORK5CYII="
payload["image_base64"] = white_10x10
payload["mode"] = "car"
response = requests.post(url, json=payload, timeout=30)
data = response.json()
print(f"Success: {data.get('success')}")
print(f"Background removed: {data.get('metadata', {}).get('has_background_removed')}")
print(f"Processing time: {data.get('metadata', {}).get('processing_time_ms')}ms")

# The issue might be that API4.ai is returning an error that's being caught
# Since we're seeing consistent "has_background_removed: False" with long processing times,
# it suggests the API is being called but failing

print("\n" + "=" * 50)
print("Diagnosis:")
print("- The service IS calling API4.ai (long processing times)")
print("- But background removal is failing silently")
print("- Possible causes:")
print("  1. API4AI_KEY is set but invalid/expired")
print("  2. API4.ai is rejecting the requests")
print("  3. The response format from API4.ai has changed")
print("\nTo fix this, you need to:")
print("1. Check Railway logs for 'Background removal failed' messages")
print("2. Verify the API4AI_KEY is correct and has credits")
print("3. Test the key directly with API4.ai")