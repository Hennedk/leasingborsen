#!/usr/bin/env python3
"""Test script for photoreal ground shadow functionality"""

import requests
import base64
import json
from PIL import Image, ImageDraw
import io

def create_car_silhouette():
    """Create a simple car silhouette for testing"""
    img = Image.new('RGBA', (400, 200), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Car body (simplified shape)
    body_color = (220, 50, 50, 255)  # Red car
    # Main body
    draw.rectangle([50, 80, 350, 150], fill=body_color)
    # Roof
    draw.polygon([(100, 80), (150, 50), (250, 50), (300, 80)], fill=body_color)
    
    # Windows (darker)
    window_color = (100, 20, 20, 255)
    draw.polygon([(110, 75), (145, 55), (195, 55), (195, 75)], fill=window_color)
    draw.polygon([(205, 55), (245, 55), (280, 75), (205, 75)], fill=window_color)
    
    # Wheels (black circles)
    wheel_color = (20, 20, 20, 255)
    draw.ellipse([80, 130, 120, 170], fill=wheel_color)   # Front wheel
    draw.ellipse([280, 130, 320, 170], fill=wheel_color)  # Rear wheel
    
    return img

def test_photoreal_shadows():
    """Test the photoreal shadow implementation"""
    
    # Create test car image
    car_img = create_car_silhouette()
    
    # Convert to base64
    buffer = io.BytesIO()
    car_img.save(buffer, format='PNG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    # Test configurations
    test_configs = [
        {
            'name': 'ground-default',
            'shadow_type': 'ground',
            'description': 'Default photoreal ground shadow with wheel hotspots'
        },
        {
            'name': 'dual-ground',
            'shadow_type': 'dual_ground',
            'description': 'Dual concentrated shadows under wheels'
        },
        {
            'name': 'drop-comparison',
            'shadow_type': 'drop',
            'description': 'Traditional drop shadow for comparison'
        }
    ]
    
    print("🎨 Testing Photoreal Ground Shadow Implementation")
    print("=" * 50)
    
    for config in test_configs:
        print(f"\n📸 Testing: {config['description']}")
        print(f"   Type: {config['shadow_type']}")
        
        # Make request
        response = requests.post(
            'http://localhost:8000/process-image',
            json={
                'image_base64': img_base64,
                'filename': f"test-{config['name']}.png",
                'options': {
                    'remove_background': False,
                    'auto_crop': False,
                    'add_shadow': True,
                    'shadow_type': config['shadow_type'],
                    'create_sizes': False
                }
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            if result['success']:
                print(f"   ✅ Success!")
                print(f"   Shadow type: {result['metadata'].get('shadow_type', 'N/A')}")
                print(f"   Processing time: {result['metadata']['processing_time_ms']}ms")
                
                # Save result
                if result.get('processed'):
                    processed_data = base64.b64decode(result['processed'])
                    filename = f'photoreal-output-{config["name"]}.webp'
                    with open(filename, 'wb') as f:
                        f.write(processed_data)
                    print(f"   💾 Saved to: {filename}")
                    
                    # Also save as PNG for easier viewing
                    processed_img = Image.open(io.BytesIO(processed_data))
                    png_filename = f'photoreal-output-{config["name"]}.png'
                    processed_img.save(png_filename, 'PNG')
                    print(f"   💾 PNG version: {png_filename}")
            else:
                print(f"   ❌ Processing failed: {result.get('error')}")
        else:
            print(f"   ❌ HTTP Error: {response.status_code}")
            print(f"   Response: {response.text}")
    
    print("\n" + "=" * 50)
    print("✨ Testing complete! Check the output files to compare shadow types:")
    print("   - photoreal-output-ground-default.png (with wheel hotspots)")
    print("   - photoreal-output-dual-ground.png (concentrated wheel shadows)")
    print("   - photoreal-output-drop-comparison.png (traditional shadow)")

if __name__ == "__main__":
    print("\n🚀 Photoreal Shadow Test")
    print("Make sure the Python service is running locally on port 8000")
    print("Run with: cd railway-pdfplumber-poc && python app.py\n")
    test_photoreal_shadows()