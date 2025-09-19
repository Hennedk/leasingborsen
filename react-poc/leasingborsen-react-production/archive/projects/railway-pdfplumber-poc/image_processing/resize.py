"""Image resizing functionality for different display contexts"""
from PIL import Image
from typing import Dict, Tuple
import io
import base64


# Standard sizes for different contexts
IMAGE_SIZES = {
    'grid': (400, 300),      # Grid view thumbnail
    'detail': (1200, 800),   # Detail page view
    'full': (2560, 1920)     # Full resolution (max)
}


def create_image_sizes(
    image: Image.Image,
    sizes: Dict[str, Tuple[int, int]] = None,
    quality: int = 85,
    format: str = 'WEBP'
) -> Dict[str, str]:
    """
    Create multiple sized versions of an image.
    
    Args:
        image: PIL Image to resize
        sizes: Dict of size name to (width, height) tuples
        quality: JPEG/WebP quality (1-100)
        format: Output format (WEBP, JPEG, PNG)
    
    Returns:
        Dict of size name to base64 encoded image
    """
    if sizes is None:
        sizes = IMAGE_SIZES
    
    results = {}
    
    for size_name, (max_width, max_height) in sizes.items():
        # Calculate aspect-preserving dimensions
        resized = resize_preserve_aspect(image, max_width, max_height)
        
        # Convert to base64
        buffer = io.BytesIO()
        
        # Use appropriate save options based on format
        save_kwargs = {'format': format}
        if format in ['JPEG', 'WEBP']:
            save_kwargs['quality'] = quality
            save_kwargs['optimize'] = True
        
        resized.save(buffer, **save_kwargs)
        buffer.seek(0)
        
        # Encode to base64
        results[size_name] = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return results


def resize_preserve_aspect(
    image: Image.Image,
    max_width: int,
    max_height: int,
    resample: Image.Resampling = Image.Resampling.LANCZOS
) -> Image.Image:
    """
    Resize image preserving aspect ratio.
    
    Args:
        image: PIL Image to resize
        max_width: Maximum width
        max_height: Maximum height
        resample: Resampling filter
    
    Returns:
        Resized PIL Image
    """
    # Get current dimensions
    width, height = image.size
    
    # Calculate scaling factor
    scale = min(max_width / width, max_height / height)
    
    # Don't upscale
    if scale >= 1:
        return image.copy()
    
    # Calculate new dimensions
    new_width = int(width * scale)
    new_height = int(height * scale)
    
    # Resize
    return image.resize((new_width, new_height), resample)


def create_thumbnail(
    image: Image.Image,
    size: Tuple[int, int] = (400, 300),
    crop: bool = True
) -> Image.Image:
    """
    Create a thumbnail with optional center cropping.
    
    Args:
        image: PIL Image
        size: Target size as (width, height)
        crop: Whether to crop to exact size
    
    Returns:
        Thumbnail PIL Image
    """
    if crop:
        # Calculate crop to fill entire thumbnail
        img_ratio = image.width / image.height
        thumb_ratio = size[0] / size[1]
        
        if img_ratio > thumb_ratio:
            # Image is wider, crop width
            new_height = size[1]
            new_width = int(new_height * img_ratio)
        else:
            # Image is taller, crop height
            new_width = size[0]
            new_height = int(new_width / img_ratio)
        
        # Resize to intermediate size
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Center crop to final size
        left = (new_width - size[0]) // 2
        top = (new_height - size[1]) // 2
        right = left + size[0]
        bottom = top + size[1]
        
        return image.crop((left, top, right, bottom))
    else:
        # Just resize preserving aspect
        return resize_preserve_aspect(image, size[0], size[1])