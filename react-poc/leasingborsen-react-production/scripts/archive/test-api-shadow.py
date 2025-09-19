#!/usr/bin/env python3
"""Test script for API4AI shadow feature"""

import requests
import base64
import json
from PIL import Image, ImageDraw
import io

def create_test_car():
    """Create a simple car image for testing"""
    img = Image.new('RGBA', (400, 200), (255, 255, 255, 255))  # White background
    draw = ImageDraw.Draw(img)
    
    # Car body
    draw.rectangle([50, 80, 350, 150], fill=(220, 50, 50, 255))  # Red
    draw.polygon([(100, 80), (150, 50), (250, 50), (300, 80)], fill=(220, 50, 50, 255))  # Roof
    
    # Windows
    draw.polygon([(110, 75), (145, 55), (195, 55), (195, 75)], fill=(50, 50, 150, 255))
    draw.polygon([(205, 55), (245, 55), (280, 75), (205, 75)], fill=(50, 50, 150, 255))
    
    # Wheels
    draw.ellipse([80, 130, 120, 170], fill=(30, 30, 30, 255))
    draw.ellipse([280, 130, 320, 170], fill=(30, 30, 30, 255))
    
    return img

def test_api_shadow():
    """Test the API shadow feature"""
    
    # Create test car
    car_img = create_test_car()
    
    # Convert to base64
    buffer = io.BytesIO()
    car_img.save(buffer, format='PNG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    # Test configurations
    tests = [
        {
            'name': 'with-api-shadow',
            'remove_background': True,
            'add_shadow': True,
            'description': 'Background removal with API shadow'
        },
        {
            'name': 'without-shadow',
            'remove_background': True,
            'add_shadow': False,
            'description': 'Background removal without shadow'
        },
        {
            'name': 'custom-shadow-only',
            'remove_background': False,
            'add_shadow': True,
            'description': 'Custom shadow without background removal'
        }
    ]
    
    print("🧪 Testing API Shadow Feature")
    print("=" * 50)
    
    for test in tests:
        print(f"\n📸 Test: {test['description']}")
        print(f"   Config: remove_bg={test['remove_background']}, shadow={test['add_shadow']}")
        
        # Make request
        response = requests.post(
            'http://localhost:8000/process-image',
            json={
                'image_base64': img_base64,
                'filename': f"test-{test['name']}.png",
                'options': {
                    'remove_background': test['remove_background'],
                    'add_shadow': test['add_shadow'],
                    'auto_crop': False,
                    'create_sizes': False
                }
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            if result['success']:
                print(f"   ✅ Success!")
                print(f"   Background removed: {result['metadata'].get('has_background_removed', False)}")
                print(f"   Shadow added: {result['metadata'].get('has_shadow', False)}")
                print(f"   Shadow type: {result['metadata'].get('shadow_type', 'None')}")
                print(f"   Processing time: {result['metadata']['processing_time_ms']}ms")
                
                # Save result
                if result.get('processed'):
                    processed_data = base64.b64decode(result['processed'])
                    filename = f'api-shadow-test-{test["name"]}.webp'
                    with open(filename, 'wb') as f:
                        f.write(processed_data)
                    print(f"   💾 Saved to: {filename}")
                    
                    # Also save as PNG
                    processed_img = Image.open(io.BytesIO(processed_data))
                    png_filename = f'api-shadow-test-{test["name"]}.png'
                    processed_img.save(png_filename, 'PNG')
                    print(f"   💾 PNG version: {png_filename}")
            else:
                print(f"   ❌ Processing failed: {result.get('error')}")
        else:
            print(f"   ❌ HTTP Error: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
    
    print("\n" + "=" * 50)
    print("✨ Testing complete! Check the output files:")
    print("   - api-shadow-test-with-api-shadow.png (API shadow)")
    print("   - api-shadow-test-without-shadow.png (no shadow)")
    print("   - api-shadow-test-custom-shadow-only.png (custom shadow)")
    print("\n📌 API shadow is applied when remove_background=True and add_shadow=True")

if __name__ == "__main__":
    print("\n🚀 API Shadow Test")
    print("Make sure the Python service is running locally on port 8000")
    print("Run with: cd railway-pdfplumber-poc && python app.py\n")
    test_api_shadow()