"""Drop shadow functionality for car images"""
from PIL import Image, ImageFilter, ImageDraw
import numpy as np


def add_drop_shadow(
    image: Image.Image,
    offset: tuple = (10, 10),
    shadow_color: tuple = (0, 0, 0, 128),
    blur_radius: int = 20,
    expand_canvas: int = 50
) -> Image.Image:
    """
    Add a drop shadow to an image with transparent background.
    
    Args:
        image: PIL Image (should have alpha channel)
        offset: Shadow offset as (x, y) tuple
        shadow_color: RGBA color for shadow
        blur_radius: Blur radius for shadow softness
        expand_canvas: Pixels to expand canvas on each side
    
    Returns:
        PIL Image with drop shadow
    """
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Calculate new dimensions with expanded canvas
    new_width = image.width + (2 * expand_canvas)
    new_height = image.height + (2 * expand_canvas)
    
    # Create new image with transparent background
    result = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))
    
    # Create shadow layer
    shadow = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))
    
    # Extract alpha channel from original image
    _, _, _, alpha = image.split()
    
    # Create shadow from alpha channel
    shadow_alpha = Image.new('L', (new_width, new_height), 0)
    shadow_alpha.paste(alpha, (expand_canvas, expand_canvas))
    
    # Apply blur to shadow
    shadow_alpha = shadow_alpha.filter(ImageFilter.GaussianBlur(blur_radius))
    
    # Create colored shadow
    shadow_layer = Image.new('RGBA', (new_width, new_height), shadow_color)
    shadow_layer.putalpha(shadow_alpha)
    
    # Paste shadow with offset
    result.paste(shadow_layer, (offset[0], offset[1]), shadow_layer)
    
    # Paste original image on top
    result.paste(image, (expand_canvas, expand_canvas), image)
    
    return result


def add_simple_shadow(
    image: Image.Image,
    shadow_size: int = 10,
    shadow_opacity: float = 0.3
) -> Image.Image:
    """
    Add a simple drop shadow by expanding canvas and adding gradient.
    
    Args:
        image: PIL Image
        shadow_size: Size of shadow in pixels
        shadow_opacity: Opacity of shadow (0-1)
    
    Returns:
        PIL Image with shadow
    """
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Create new canvas
    new_width = image.width + (2 * shadow_size)
    new_height = image.height + (2 * shadow_size)
    
    # Create result with white background
    result = Image.new('RGBA', (new_width, new_height), (255, 255, 255, 255))
    
    # Create shadow gradient
    shadow = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    
    # Draw shadow rectangle with gradient
    for i in range(shadow_size):
        opacity = int(shadow_opacity * 255 * (1 - i / shadow_size))
        draw.rectangle(
            [i, i, new_width - i - 1, new_height - i - 1],
            fill=(0, 0, 0, opacity)
        )
    
    # Composite shadow and image
    result = Image.alpha_composite(result, shadow)
    result.paste(image, (shadow_size, shadow_size), image)
    
    return result