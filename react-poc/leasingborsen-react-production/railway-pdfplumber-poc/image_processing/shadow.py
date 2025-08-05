"""Drop shadow functionality for car images"""
from PIL import Image, ImageFilter, ImageDraw
import numpy as np
import math


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


def add_ground_shadow(
    image: Image.Image,
    shadow_height_ratio: float = 0.15,
    shadow_width_ratio: float = 0.9,
    offset: tuple = (0, 3),
    blur_radius: int = 35,
    opacity_center: float = 0.7,
    opacity_edge: float = 0.0,
    shadow_color: tuple = (0, 0, 0),
    expand_canvas: int = 60
) -> Image.Image:
    """
    Add a realistic ground shadow beneath a car image.
    
    Args:
        image: PIL Image (should have alpha channel)
        shadow_height_ratio: Height of shadow as ratio of car height (0.15 = 15%)
        shadow_width_ratio: Width of shadow as ratio of car width (0.9 = 90%)
        offset: Shadow offset as (x, y) tuple - minimal for ground effect
        blur_radius: Blur radius for shadow softness (higher = softer)
        opacity_center: Opacity at shadow center (0-1)
        opacity_edge: Opacity at shadow edge (0-1)
        shadow_color: RGB color for shadow
        expand_canvas: Pixels to expand canvas on each side
    
    Returns:
        PIL Image with ground shadow
    """
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Get image dimensions
    img_width, img_height = image.size
    
    # Find the bottom of the car (lowest non-transparent pixel)
    alpha = image.split()[3]
    alpha_array = np.array(alpha)
    
    # Find rows with non-transparent pixels
    non_transparent_rows = np.any(alpha_array > 0, axis=1)
    if not np.any(non_transparent_rows):
        # No visible pixels, return original
        return image
    
    # Get the bottom edge of the car
    bottom_edge = np.max(np.where(non_transparent_rows)[0])
    
    # Calculate shadow dimensions
    shadow_width = int(img_width * shadow_width_ratio)
    shadow_height = int(img_height * shadow_height_ratio)
    
    # Create new canvas
    new_width = img_width + (2 * expand_canvas)
    new_height = img_height + (2 * expand_canvas)
    
    # Create result with transparent background
    result = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))
    
    # Create shadow layer
    shadow_layer = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))
    
    # Create a separate image for the ellipse with radial gradient
    ellipse_img = Image.new('L', (shadow_width * 2, shadow_height * 2), 0)
    
    # Create radial gradient for the ellipse
    center_x = shadow_width
    center_y = shadow_height
    
    for y in range(shadow_height * 2):
        for x in range(shadow_width * 2):
            # Calculate normalized distance from center (0 to 1)
            dx = (x - center_x) / shadow_width
            dy = (y - center_y) / shadow_height
            distance = math.sqrt(dx * dx + dy * dy)
            
            # Only draw within ellipse
            if distance <= 1.0:
                # Calculate opacity with smooth falloff
                opacity = opacity_center * (1 - distance) + opacity_edge * distance
                pixel_value = int(opacity * 255)
                ellipse_img.putpixel((x, y), pixel_value)
    
    # Apply blur to soften edges
    ellipse_img = ellipse_img.filter(ImageFilter.GaussianBlur(blur_radius))
    
    # Create colored shadow from the gradient
    shadow_colored = Image.new('RGBA', (shadow_width * 2, shadow_height * 2), 
                               (*shadow_color, 255))
    shadow_colored.putalpha(ellipse_img)
    
    # Calculate position for shadow (centered under the car)
    shadow_x = expand_canvas + (img_width - shadow_width) // 2 + offset[0]
    shadow_y = expand_canvas + bottom_edge - shadow_height // 2 + offset[1]
    
    # Crop the ellipse to fit
    ellipse_cropped = shadow_colored.crop((
        center_x - shadow_width // 2,
        center_y - shadow_height // 2,
        center_x + shadow_width // 2,
        center_y + shadow_height // 2
    ))
    
    # Paste shadow onto shadow layer
    shadow_layer.paste(ellipse_cropped, (shadow_x, shadow_y), ellipse_cropped)
    
    # Composite shadow onto result
    result = Image.alpha_composite(result, shadow_layer)
    
    # Paste original image on top
    result.paste(image, (expand_canvas, expand_canvas), image)
    
    return result


def add_dual_ground_shadow(
    image: Image.Image,
    wheel_spacing_ratio: float = 0.6,
    shadow_size_ratio: float = 0.25,
    offset: tuple = (0, 3),
    blur_radius: int = 30,
    opacity_center: float = 0.8,
    opacity_edge: float = 0.0,
    shadow_color: tuple = (0, 0, 0),
    expand_canvas: int = 60
) -> Image.Image:
    """
    Add realistic ground shadows under both wheels of a car.
    
    Args:
        image: PIL Image (should have alpha channel)
        wheel_spacing_ratio: Distance between shadows as ratio of car width
        shadow_size_ratio: Size of each shadow as ratio of car width
        offset: Shadow offset as (x, y) tuple
        blur_radius: Blur radius for shadow softness
        opacity_center: Opacity at shadow center (0-1)
        opacity_edge: Opacity at shadow edge (0-1)
        shadow_color: RGB color for shadow
        expand_canvas: Pixels to expand canvas on each side
    
    Returns:
        PIL Image with dual ground shadows
    """
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Get image dimensions
    img_width, img_height = image.size
    
    # Find the bottom of the car
    alpha = image.split()[3]
    alpha_array = np.array(alpha)
    non_transparent_rows = np.any(alpha_array > 0, axis=1)
    
    if not np.any(non_transparent_rows):
        return image
    
    bottom_edge = np.max(np.where(non_transparent_rows)[0])
    
    # Calculate shadow parameters
    shadow_size = int(img_width * shadow_size_ratio)
    wheel_spacing = int(img_width * wheel_spacing_ratio)
    
    # Create new canvas
    new_width = img_width + (2 * expand_canvas)
    new_height = img_height + (2 * expand_canvas)
    
    result = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))
    shadow_layer = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))
    
    # Create two elliptical shadows
    for i, x_offset in enumerate([-wheel_spacing // 2, wheel_spacing // 2]):
        # Create ellipse with radial gradient
        ellipse_img = Image.new('L', (shadow_size * 2, shadow_size * 2), 0)
        
        center = shadow_size
        for y in range(shadow_size * 2):
            for x in range(shadow_size * 2):
                dx = (x - center) / shadow_size
                dy = (y - center) / (shadow_size * 0.4)  # Flatten vertically
                distance = math.sqrt(dx * dx + dy * dy)
                
                if distance <= 1.0:
                    opacity = opacity_center * (1 - distance) + opacity_edge * distance
                    pixel_value = int(opacity * 255)
                    ellipse_img.putpixel((x, y), pixel_value)
        
        # Apply blur
        ellipse_img = ellipse_img.filter(ImageFilter.GaussianBlur(blur_radius))
        
        # Create colored shadow
        shadow_colored = Image.new('RGBA', (shadow_size * 2, shadow_size * 2),
                                  (*shadow_color, 255))
        shadow_colored.putalpha(ellipse_img)
        
        # Calculate position
        shadow_x = expand_canvas + img_width // 2 + x_offset - shadow_size // 2 + offset[0]
        shadow_y = expand_canvas + bottom_edge - int(shadow_size * 0.2) + offset[1]
        
        # Crop and paste
        ellipse_cropped = shadow_colored.crop((
            center - shadow_size // 2,
            center - int(shadow_size * 0.2),
            center + shadow_size // 2,
            center + int(shadow_size * 0.2)
        ))
        
        shadow_layer.paste(ellipse_cropped, (shadow_x, shadow_y), ellipse_cropped)
    
    # Composite and return
    result = Image.alpha_composite(result, shadow_layer)
    result.paste(image, (expand_canvas, expand_canvas), image)
    
    return result