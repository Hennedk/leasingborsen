#!/usr/bin/env python3
"""
Compare different shadow types to diagnose API shadow appearance
"""

import requests
import base64
import io
from PIL import Image, ImageDraw, ImageFont
import os

def create_test_car_image():
    """Create a simple car image for testing"""
    img = Image.new('RGBA', (600, 400), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Car body (red)
    draw.rectangle([100, 150, 500, 280], fill=(220, 50, 50, 255))
    
    # Roof
    draw.polygon([(150, 150), (200, 100), (400, 100), (450, 150)], fill=(220, 50, 50, 255))
    
    # Windows (blue)
    draw.polygon([(160, 140), (195, 110), (280, 110), (280, 140)], fill=(100, 150, 200, 255))
    draw.polygon([(290, 110), (385, 110), (420, 140), (290, 140)], fill=(100, 150, 200, 255))
    
    # Wheels (black)
    draw.ellipse([140, 250, 200, 310], fill=(30, 30, 30, 255))
    draw.ellipse([400, 250, 460, 310], fill=(30, 30, 30, 255))
    
    # Wheel rims (gray)
    draw.ellipse([155, 265, 185, 295], fill=(150, 150, 150, 255))
    draw.ellipse([415, 265, 445, 295], fill=(150, 150, 150, 255))
    
    return img

def test_shadow_configurations():
    """Test different shadow configurations"""
    
    # Create test car
    car_img = create_test_car_image()
    
    # Save original
    car_img.save('test-car-original.png')
    print("✅ Created test car image: test-car-original.png")
    
    # Convert to base64
    buffer = io.BytesIO()
    car_img.save(buffer, format='PNG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    # Test configurations
    tests = [
        {
            'name': 'api-shadow',
            'options': {
                'remove_background': True,
                'add_shadow': True,
                'auto_crop': True,
                'create_sizes': False
            },
            'description': 'API Shadow (via background removal)'
        },
        {
            'name': 'no-shadow',
            'options': {
                'remove_background': True,
                'add_shadow': False,
                'auto_crop': True,
                'create_sizes': False
            },
            'description': 'No Shadow (background removal only)'
        },
        {
            'name': 'custom-drop',
            'options': {
                'remove_background': False,
                'add_shadow': True,
                'shadow_type': 'drop',
                'auto_crop': True,
                'create_sizes': False
            },
            'description': 'Custom Drop Shadow'
        },
        {
            'name': 'custom-ground',
            'options': {
                'remove_background': False,
                'add_shadow': True,
                'shadow_type': 'ground',
                'auto_crop': True,
                'create_sizes': False
            },
            'description': 'Custom Ground Shadow'
        }
    ]
    
    # Python service URL
    service_url = 'https://leasingborsen-production.up.railway.app/process-image'
    
    results = []
    
    for test in tests:
        print(f"\n🧪 Testing: {test['description']}")
        
        try:
            response = requests.post(
                service_url,
                json={
                    'image_base64': img_base64,
                    'filename': f"test-{test['name']}.png",
                    'options': test['options']
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result['success']:
                    # Save result
                    processed_data = base64.b64decode(result['processed'])
                    filename = f"shadow-compare-{test['name']}.webp"
                    with open(filename, 'wb') as f:
                        f.write(processed_data)
                    
                    # Convert to PNG for easier viewing
                    processed_img = Image.open(io.BytesIO(processed_data))
                    png_filename = f"shadow-compare-{test['name']}.png"
                    processed_img.save(png_filename, 'PNG')
                    
                    print(f"   ✅ Success - Saved to: {png_filename}")
                    print(f"   Metadata: {result['metadata']}")
                    
                    results.append({
                        'name': test['name'],
                        'description': test['description'],
                        'image': processed_img,
                        'metadata': result['metadata']
                    })
                else:
                    print(f"   ❌ Processing failed: {result.get('error')}")
            else:
                print(f"   ❌ HTTP Error: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    # Create comparison image
    if len(results) >= 2:
        create_comparison_image(results)

def create_comparison_image(results):
    """Create a side-by-side comparison of all shadow types"""
    
    # Calculate dimensions
    img_width = max(r['image'].width for r in results)
    img_height = max(r['image'].height for r in results)
    padding = 20
    label_height = 60
    
    # Create canvas
    canvas_width = len(results) * (img_width + padding) + padding
    canvas_height = img_height + label_height + padding * 2
    
    canvas = Image.new('RGB', (canvas_width, canvas_height), (240, 240, 240))
    draw = ImageDraw.Draw(canvas)
    
    # Try to load a font, fall back to default if not available
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
        small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except:
        font = ImageFont.load_default()
        small_font = font
    
    # Place images
    x_offset = padding
    for result in results:
        # Draw label
        label = result['description']
        draw.text((x_offset, padding), label, fill=(0, 0, 0), font=font)
        
        # Draw metadata info
        shadow_info = f"Shadow: {result['metadata'].get('shadow_type', 'None')}"
        draw.text((x_offset, padding + 30), shadow_info, fill=(100, 100, 100), font=small_font)
        
        # Paste image
        y_offset = label_height + padding
        canvas.paste(result['image'], (x_offset, y_offset))
        
        x_offset += img_width + padding
    
    # Save comparison
    canvas.save('shadow-comparison.png')
    print("\n✅ Created comparison image: shadow-comparison.png")
    print("   This shows all shadow types side by side")

if __name__ == "__main__":
    print("🔍 Shadow Type Comparison Test")
    print("=" * 50)
    print("This will create test images with different shadow configurations")
    print("to help diagnose the API shadow appearance.\n")
    
    test_shadow_configurations()
    
    print("\n📌 Files created:")
    print("   - test-car-original.png (original test image)")
    print("   - shadow-compare-*.png (individual results)")
    print("   - shadow-comparison.png (side-by-side comparison)")
    print("\n💡 Compare these images to see the visual difference between shadow types")