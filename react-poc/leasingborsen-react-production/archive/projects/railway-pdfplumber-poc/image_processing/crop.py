"""Auto-crop functionality for removing transparent areas around car images"""
import numpy as np
from PIL import Image
from typing import Tuple, Optional


def auto_crop_with_padding(
    image: Image.Image,
    padding_percent: float = 0.05,
    min_padding: int = 20,
    max_crop_ratio: float = 0.8
) -> Image.Image:
    """
    Auto-crop implementation that removes transparent padding while preserving content.
    
    Args:
        image: PIL Image to crop (should have alpha channel)
        padding_percent: Percentage of content size to use as padding (0.05 = 5%)
        min_padding: Minimum padding in pixels regardless of percentage
        max_crop_ratio: Maximum amount of image that can be cropped (0.8 = crop max 80%)
    
    Returns:
        Cropped PIL Image with padding
    """
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Convert to numpy array
    data = np.array(image)
    
    # Get alpha channel
    if len(data.shape) == 3 and data.shape[2] == 4:
        alpha = data[:, :, 3]
    else:
        # For RGB, create fake alpha (all opaque)
        alpha = np.ones((data.shape[0], data.shape[1])) * 255
    
    # Find content bounds (pixels with alpha > 10)
    rows = np.any(alpha > 10, axis=1)
    cols = np.any(alpha > 10, axis=0)
    
    if not np.any(rows) or not np.any(cols):
        return image  # Empty image, return as-is
    
    # Get bounding box of non-transparent content
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    
    # Calculate content dimensions
    content_width = cmax - cmin
    content_height = rmax - rmin
    
    # Calculate padding
    pad_x = max(min_padding, int(content_width * padding_percent))
    pad_y = max(min_padding, int(content_height * padding_percent))
    
    # Apply bounds with padding
    left = max(0, cmin - pad_x)
    top = max(0, rmin - pad_y)
    right = min(image.width, cmax + pad_x + 1)
    bottom = min(image.height, rmax + pad_y + 1)
    
    # Ensure minimum size based on max_crop_ratio
    if (right - left) / image.width < (1 - max_crop_ratio):
        center_x = (left + right) // 2
        half_width = int(image.width * (1 - max_crop_ratio) / 2)
        left = max(0, center_x - half_width)
        right = min(image.width, center_x + half_width)
    
    if (bottom - top) / image.height < (1 - max_crop_ratio):
        center_y = (top + bottom) // 2
        half_height = int(image.height * (1 - max_crop_ratio) / 2)
        top = max(0, center_y - half_height)
        bottom = min(image.height, center_y + half_height)
    
    # Crop the image
    return image.crop((left, top, right, bottom))


def get_content_bounds(image: Image.Image, threshold: int = 10) -> Optional[Tuple[int, int, int, int]]:
    """
    Get the bounding box of non-transparent content in an image.
    
    Args:
        image: PIL Image with alpha channel
        threshold: Alpha threshold for considering a pixel as content
    
    Returns:
        Tuple of (left, top, right, bottom) or None if no content found
    """
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    data = np.array(image)
    alpha = data[:, :, 3]
    
    rows = np.any(alpha > threshold, axis=1)
    cols = np.any(alpha > threshold, axis=0)
    
    if not np.any(rows) or not np.any(cols):
        return None
    
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    
    return (cmin, rmin, cmax + 1, rmax + 1)