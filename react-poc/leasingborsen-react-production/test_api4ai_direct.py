#!/usr/bin/env python3
"""Test API4.ai directly to verify the key works"""
import requests
import base64
import os

print("Direct API4.ai test")
print("=" * 50)

# You'll need to set this to your actual API key
API_KEY = "YOUR_API4AI_KEY_HERE"

# Small test image
test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGklEQVQYlWP8////fwYKAOOoQnpbOLoQCAAAW0wCARZJVCoAAAAASUVORK5CYII="
image_bytes = base64.b64decode(test_image_b64)

# Test the API directly
url = 'https://api4.ai/api/v1/background'

print(f"Testing API4.ai directly...")
print(f"URL: {url}")
print(f"Image size: {len(image_bytes)} bytes")

# Create the request
files = {
    'image': ('test.png', image_bytes, 'image/png')
}
data = {
    'mode': 'car'
}
headers = {
    'X-Api-Key': API_KEY
}

try:
    response = requests.post(url, files=files, data=data, headers=headers, timeout=30)
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        result = response.json()
        print("\nResponse JSON structure:")
        print(json.dumps(result, indent=2)[:500] + "...")
        
        # Check if successful
        if result.get('status', {}).get('code') == 'ok':
            print("\n✅ API4.ai is working correctly!")
            
            # Try to find the result image
            results = result.get('results', [])
            if results:
                entities = results[0].get('entities', [])
                for entity in entities:
                    if entity.get('kind') == 'image' and entity.get('name') == 'result':
                        print("✅ Found result image in response")
                        break
        else:
            print(f"\n❌ API4.ai returned error: {result.get('status', {}).get('message')}")
    else:
        print(f"\n❌ HTTP Error: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
except Exception as e:
    print(f"\n❌ Request failed: {e}")

print("\n" + "=" * 50)
print("To use this test:")
print("1. Replace YOUR_API4AI_KEY_HERE with your actual API key")
print("2. Run: python3 test_api4ai_direct.py")
print("3. If it works here but not in Railway, the key might not be set correctly in Railway")
print("4. If it fails here too, the key is invalid/expired")