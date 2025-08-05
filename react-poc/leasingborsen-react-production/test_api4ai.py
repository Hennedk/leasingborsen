#!/usr/bin/env python3
"""Test API4.ai integration directly"""
import requests
import json
import time

# Small test image (1x1 pixel PNG - known working)
test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

print("Testing Railway image processing service...")
print("=" * 50)

# Test 1: Basic health check
print("\n1. Health check:")
response = requests.get("https://leasingborsen-production.up.railway.app/")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

# Test 2: Process with background removal
print("\n2. Testing with background removal:")
url = "https://leasingborsen-production.up.railway.app/process-image"
payload = {
    "image_base64": test_image,
    "filename": "test.png",
    "options": {
        "remove_background": True,
        "auto_crop": False,
        "add_shadow": False,
        "create_sizes": False
    },
    "mode": "car"
}

start_time = time.time()
response = requests.post(url, json=payload, timeout=30)
elapsed = time.time() - start_time

print(f"Status: {response.status_code}")
print(f"Time taken: {elapsed:.2f}s")

if response.status_code == 200:
    data = response.json()
    print(f"Success: {data.get('success')}")
    
    if data.get('metadata'):
        print("Metadata:")
        for k, v in data['metadata'].items():
            print(f"  {k}: {v}")
    
    if data.get('error'):
        print(f"Error: {data['error']}")
    
    # If background removal worked, the processing time should be > 1000ms
    # because API4.ai takes time
    metadata = data.get('metadata', {}) if data else {}
    processing_ms = metadata.get('processing_time_ms', 0)
    if processing_ms < 100:
        print("\n⚠️ WARNING: Processing was too fast, API4.ai might not be working")
    else:
        print("\n✅ Processing time suggests API4.ai was called")
else:
    print(f"Error response: {response.text}")

# Test 3: Check if caching works
print("\n3. Testing cache (same request again):")
start_time = time.time()
response = requests.post(url, json=payload, timeout=30)
elapsed = time.time() - start_time

if response.status_code == 200:
    data = response.json()
    processing_time = data.get('metadata', {}).get('processing_time_ms', 0)
    print(f"Processing time: {processing_time}ms")
    print(f"Total request time: {elapsed:.2f}s")
    
    if processing_time < 10:
        print("✅ Cache hit confirmed (very fast processing)")
    else:
        print("❌ Cache might not be working")

# Test 4: Check cache stats
print("\n4. Cache statistics:")
response = requests.get("https://leasingborsen-production.up.railway.app/cache/stats")
if response.status_code == 200:
    print(json.dumps(response.json(), indent=2))