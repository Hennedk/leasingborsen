"""Tests for image processing functionality"""
import pytest
from PIL import Image
import numpy as np
import io
import base64

from image_processing import (
    auto_crop_with_padding,
    add_drop_shadow,
    create_image_sizes
)
from image_processing.crop import get_content_bounds


class TestAutoCrop:
    """Test auto-crop functionality"""
    
    @pytest.fixture
    def transparent_bg_image(self):
        """Create test image with transparent background"""
        # Create 2560x1440 image with transparent background
        img = Image.new('RGBA', (2560, 1440), (0, 0, 0, 0))
        
        # Add car-like content in center (960x640)
        pixels = img.load()
        for x in range(800, 1760):
            for y in range(400, 1040):
                pixels[x, y] = (50, 50, 50, 255)
        
        return img
    
    @pytest.fixture
    def solid_bg_image(self):
        """Create test image with white background"""
        img = Image.new('RGBA', (2560, 1440), (255, 255, 255, 255))
        
        # Add car content
        pixels = img.load()
        for x in range(800, 1760):
            for y in range(400, 1040):
                pixels[x, y] = (50, 50, 50, 255)
        
        return img
    
    def test_auto_crop_removes_transparent_padding(self, transparent_bg_image):
        """Test that auto-crop correctly removes transparent areas"""
        cropped = auto_crop_with_padding(transparent_bg_image)
        
        # Should be much smaller than original
        assert cropped.width < 1200  # Original was 2560
        assert cropped.height < 900  # Original was 1440
        
        # But should include padding
        assert cropped.width > 960   # Content width
        assert cropped.height > 640  # Content height
    
    def test_auto_crop_preserves_content(self, transparent_bg_image):
        """Test that no content pixels are lost"""
        # Get original content bounds
        original_bounds = get_content_bounds(transparent_bg_image)
        content_width = original_bounds[2] - original_bounds[0]
        content_height = original_bounds[3] - original_bounds[1]
        
        # Crop image
        cropped = auto_crop_with_padding(transparent_bg_image)
        
        # Convert to numpy for analysis
        cropped_array = np.array(cropped)
        
        # Count non-transparent pixels
        non_transparent = np.sum(cropped_array[:, :, 3] > 10)
        expected_pixels = content_width * content_height
        
        # All content should be preserved
        assert non_transparent >= expected_pixels * 0.95  # Allow small rounding differences
    
    def test_auto_crop_with_custom_padding(self, transparent_bg_image):
        """Test custom padding percentages"""
        # Test with 10% padding
        cropped = auto_crop_with_padding(transparent_bg_image, padding_percent=0.1)
        
        # Should have more padding
        assert cropped.width > 1050  # 960 + ~10%
        assert cropped.height > 700  # 640 + ~10%
    
    def test_auto_crop_empty_image(self):
        """Test cropping completely transparent image"""
        empty = Image.new('RGBA', (1000, 1000), (0, 0, 0, 0))
        cropped = auto_crop_with_padding(empty)
        
        # Should return original
        assert cropped.size == empty.size


class TestDropShadow:
    """Test drop shadow functionality"""
    
    @pytest.fixture
    def car_image(self):
        """Create simple car image with transparent background"""
        img = Image.new('RGBA', (800, 600), (0, 0, 0, 0))
        
        # Draw simple car shape
        pixels = img.load()
        for x in range(100, 700):
            for y in range(200, 400):
                pixels[x, y] = (100, 100, 100, 255)
        
        return img
    
    def test_drop_shadow_increases_canvas(self, car_image):
        """Test that shadow expands canvas size"""
        with_shadow = add_drop_shadow(car_image)
        
        assert with_shadow.width > car_image.width
        assert with_shadow.height > car_image.height
    
    def test_drop_shadow_preserves_original(self, car_image):
        """Test that original image is preserved"""
        with_shadow = add_drop_shadow(car_image)
        
        # Check center pixels are still there
        center_x = with_shadow.width // 2
        center_y = with_shadow.height // 2
        
        pixel = with_shadow.getpixel((center_x, center_y))
        assert pixel[3] > 0  # Has alpha (not transparent)
    
    def test_custom_shadow_parameters(self, car_image):
        """Test custom shadow settings"""
        with_shadow = add_drop_shadow(
            car_image,
            offset=(20, 20),
            shadow_color=(255, 0, 0, 100),
            blur_radius=30,
            expand_canvas=100
        )
        
        # Should be significantly larger
        assert with_shadow.width == car_image.width + 200
        assert with_shadow.height == car_image.height + 200


class TestImageResize:
    """Test image resizing functionality"""
    
    @pytest.fixture
    def large_image(self):
        """Create large test image"""
        return Image.new('RGBA', (3000, 2000), (255, 255, 255, 255))
    
    def test_create_standard_sizes(self, large_image):
        """Test creation of standard size variants"""
        sizes = create_image_sizes(large_image)
        
        # Should have all standard sizes
        assert 'grid' in sizes
        assert 'detail' in sizes
        assert 'full' in sizes
        
        # All should be base64 strings
        for size_name, data in sizes.items():
            assert isinstance(data, str)
            # Verify it's valid base64
            base64.b64decode(data)
    
    def test_aspect_ratio_preserved(self, large_image):
        """Test that aspect ratio is maintained"""
        sizes = create_image_sizes(large_image)
        
        # Decode grid size to check dimensions
        grid_data = base64.b64decode(sizes['grid'])
        grid_img = Image.open(io.BytesIO(grid_data))
        
        # Original aspect ratio
        original_ratio = large_image.width / large_image.height
        grid_ratio = grid_img.width / grid_img.height
        
        # Should be very close
        assert abs(original_ratio - grid_ratio) < 0.01
    
    def test_no_upscaling(self):
        """Test that small images are not upscaled"""
        small = Image.new('RGBA', (200, 150), (255, 255, 255, 255))
        sizes = create_image_sizes(small)
        
        # Decode full size
        full_data = base64.b64decode(sizes['full'])
        full_img = Image.open(io.BytesIO(full_data))
        
        # Should not be larger than original
        assert full_img.width <= small.width
        assert full_img.height <= small.height


class TestCache:
    """Test caching functionality"""
    
    def test_cache_hit_and_miss(self):
        """Test basic cache operations"""
        from image_processing.cache import ImageCache
        
        cache = ImageCache(max_size=2, ttl_seconds=60)
        
        # Test miss
        result = cache.get("test_image", {"option": "value"})
        assert result is None
        
        # Test set and hit
        cache.set("test_image", {"option": "value"}, {"result": "data"})
        result = cache.get("test_image", {"option": "value"})
        assert result == {"result": "data"}
        
        # Different options should miss
        result = cache.get("test_image", {"option": "different"})
        assert result is None
    
    def test_cache_lru_eviction(self):
        """Test LRU eviction when cache is full"""
        from image_processing.cache import ImageCache
        
        cache = ImageCache(max_size=2, ttl_seconds=60)
        
        # Fill cache
        cache.set("image1", {}, {"data": 1})
        cache.set("image2", {}, {"data": 2})
        
        # Access image1 to make it more recent
        cache.get("image1", {})
        
        # Add third image, should evict image2
        cache.set("image3", {}, {"data": 3})
        
        # image1 should still be there
        assert cache.get("image1", {}) == {"data": 1}
        
        # image2 should be evicted
        assert cache.get("image2", {}) is None
        
        # image3 should be there
        assert cache.get("image3", {}) == {"data": 3}