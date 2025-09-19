#!/usr/bin/env python3
"""Test script for ground shadow functionality"""

import requests
import base64
import json
from PIL import Image
import io

def test_ground_shadow():
    """Test the ground shadow implementation"""
    
    # Test image - red square on transparent background
    test_img = Image.new('RGBA', (200, 200), (0, 0, 0, 0))
    # Draw a red square (simulating a car)
    for y in range(50, 150):
        for x in range(50, 150):
            test_img.putpixel((x, y), (255, 0, 0, 255))
    
    # Convert to base64
    buffer = io.BytesIO()
    test_img.save(buffer, format='PNG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    # Test different shadow types
    shadow_types = ['drop', 'ground', 'dual_ground']
    
    for shadow_type in shadow_types:
        print(f"\n🧪 Testing {shadow_type} shadow...")
        
        # Make request to local service
        response = requests.post(
            'http://localhost:8000/process-image',
            json={
                'image_base64': img_base64,
                'filename': f'test-{shadow_type}.png',
                'options': {
                    'remove_background': False,
                    'auto_crop': False,
                    'add_shadow': True,
                    'create_sizes': False,
                    'shadow_type': shadow_type,
                    'shadow_opacity_center': 0.7,
                    'shadow_opacity_edge': 0.0
                }
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            if result['success']:
                print(f"✅ {shadow_type} shadow applied successfully")
                print(f"   Metadata: {result['metadata']}")
                
                # Save result for visual inspection
                if result.get('processed'):
                    processed_data = base64.b64decode(result['processed'])
                    with open(f'test-output-{shadow_type}.webp', 'wb') as f:
                        f.write(processed_data)
                    print(f"   Saved to: test-output-{shadow_type}.webp")
            else:
                print(f"❌ Failed: {result.get('error')}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"   Response: {response.text}")

if __name__ == "__main__":
    print("🎨 Testing Ground Shadow Implementation")
    print("Make sure the Python service is running locally on port 8000")
    print("Run with: cd railway-pdfplumber-poc && python app.py")
    test_ground_shadow()