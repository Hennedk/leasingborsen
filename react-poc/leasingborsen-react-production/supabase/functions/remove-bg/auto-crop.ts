import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';

export interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface AutoCropOptions {
  alphaThreshold: number;
  paddingRatio: number;
  minPadding: number;
  maxCropRatio: number;
  maxAspectRatio?: number;
  minAspectRatio?: number;
}

export interface CropMetadata {
  originalDimensions: { width: number; height: number };
  cropBounds: { x: number; y: number; width: number; height: number };
  appliedPadding: number;
  processingTime: number;
  algorithmVersion: string;
}

/**
 * Find the content boundaries in an image by scanning for non-transparent pixels.
 * Uses edge-inward scanning for optimal performance.
 */
export async function findContentBounds(
  image: Image, 
  alphaThreshold: number
): Promise<ContentBounds | null> {
  // Validate image dimensions
  if (!image || !image.width || !image.height || image.width <= 0 || image.height <= 0) {
    console.error('Invalid image dimensions:', { 
      width: image?.width, 
      height: image?.height,
      hasImage: !!image,
      imageType: typeof image,
      imageKeys: image ? Object.keys(image) : []
    });
    return null;
  }
  
  // Additional validation
  const width = Math.floor(image.width);
  const height = Math.floor(image.height);
  
  if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) {
    console.error('Image dimensions are not valid numbers:', { width, height });
    return null;
  }
  
  // Test if we can actually access pixels
  try {
    // Try to access the last pixel to ensure dimensions are correct
    const testColor = image.getPixelAt(width - 1, height - 1);
    if (!testColor && testColor !== 0) {
      console.error('Cannot access pixels in image, getPixelAt returned:', testColor);
      return null;
    }
  } catch (e) {
    console.error('Image pixel access test failed:', {
      error: e.message,
      reportedWidth: width,
      reportedHeight: height,
      actualWidth: image.width,
      actualHeight: image.height
    });
    return null;
  }

  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let foundContent = false;

  // Optimized edge-inward scanning
  
  // 1. Scan from top
  topScan: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      try {
        const color = image.getPixelAt(x, y);
        const [r, g, b, a] = Image.colorToRGBA(color);
        if (a > alphaThreshold) {
          minY = y;
          foundContent = true;
          break topScan;
        }
      } catch (e) {
        console.error(`Error getting pixel at (${x}, ${y}):`, e);
        continue;
      }
    }
  }

  if (!foundContent) return null;

  // 2. Scan from bottom
  bottomScan: for (let y = height - 1; y >= minY; y--) {
    for (let x = 0; x < width; x++) {
      try {
        const color = image.getPixelAt(x, y);
        const [r, g, b, a] = Image.colorToRGBA(color);
        if (a > alphaThreshold) {
          maxY = y;
          break bottomScan;
        }
      } catch (e) {
        console.error(`Error getting pixel at (${x}, ${y}):`, e);
        continue;
      }
    }
  }

  // 3. Scan from left (only between minY and maxY)
  leftScan: for (let x = 0; x < width; x++) {
    for (let y = minY; y <= maxY; y++) {
      try {
        const color = image.getPixelAt(x, y);
        const [r, g, b, a] = Image.colorToRGBA(color);
        if (a > alphaThreshold) {
          minX = x;
          break leftScan;
        }
      } catch (e) {
        console.error(`Error getting pixel at (${x}, ${y}):`, e);
        continue;
      }
    }
  }

  // 4. Scan from right
  rightScan: for (let x = width - 1; x >= minX; x--) {
    for (let y = minY; y <= maxY; y++) {
      try {
        const color = image.getPixelAt(x, y);
        const [r, g, b, a] = Image.colorToRGBA(color);
        if (a > alphaThreshold) {
          maxX = x;
          break rightScan;
        }
      } catch (e) {
        console.error(`Error getting pixel at (${x}, ${y}):`, e);
        continue;
      }
    }
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Validate that crop bounds are within image dimensions
 */
export function validateCropBounds(
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  // Ensure crop bounds are within image
  const validX = Math.max(0, Math.min(cropX, imageWidth - 1));
  const validY = Math.max(0, Math.min(cropY, imageHeight - 1));
  const validWidth = Math.min(cropWidth, imageWidth - validX);
  const validHeight = Math.min(cropHeight, imageHeight - validY);
  
  return {
    x: validX,
    y: validY,
    width: validWidth,
    height: validHeight
  };
}

/**
 * Manual crop implementation to bypass imagescript library bug
 * The built-in Image.crop() creates corrupted objects that fail during encode()
 */
export function manualCrop(
  image: Image, 
  x: number, 
  y: number, 
  width: number, 
  height: number
): Image {
  console.log(`Manual crop: source ${image.width}x${image.height} -> crop ${width}x${height} at (${x},${y})`);
  
  // Create new image with target dimensions
  const croppedImage = new Image(width, height);
  
  // Pre-calculate bounds for efficiency
  const sourceMaxX = Math.min(x + width, image.width);
  const sourceMaxY = Math.min(y + height, image.height);
  
  // Copy pixels row by row for better cache locality
  for (let dy = 0; dy < height; dy++) {
    const sourceY = y + dy;
    if (sourceY >= sourceMaxY) break; // Early exit if we're past source bounds
    
    for (let dx = 0; dx < width; dx++) {
      const sourceX = x + dx;
      if (sourceX >= sourceMaxX) break; // Early exit for this row
      
      try {
        const pixel = image.getPixelAt(sourceX, sourceY);
        croppedImage.setPixelAt(dx, dy, pixel);
      } catch (e) {
        // If getPixelAt fails, set transparent pixel
        croppedImage.setPixelAt(dx, dy, 0x00000000);
      }
    }
  }
  
  console.log('Manual crop completed successfully');
  return croppedImage;
}

/**
 * Automatically crop an image to its content with smart padding and safety constraints
 */
export async function autoCropToContent(
  image: Image,
  options: AutoCropOptions
): Promise<{ image: Image; metadata: CropMetadata }> {
  const startTime = performance.now();
  
  try {
    // Find content bounds
    const bounds = await findContentBounds(image, options.alphaThreshold);
    
    if (!bounds) {
      // Return original if no content found
      return {
        image,
        metadata: {
          originalDimensions: { width: image.width, height: image.height },
          cropBounds: { x: 0, y: 0, width: image.width, height: image.height },
          appliedPadding: 0,
          processingTime: performance.now() - startTime,
          algorithmVersion: "1.0"
        }
      };
    }

    // Calculate content dimensions
    const contentWidth = bounds.maxX - bounds.minX + 1;
    const contentHeight = bounds.maxY - bounds.minY + 1;

    // Calculate smart padding
    const padding = Math.max(
      Math.round(Math.max(contentWidth, contentHeight) * options.paddingRatio),
      options.minPadding
    );

    // Calculate crop bounds with padding
    let cropX = Math.max(0, bounds.minX - padding);
    let cropY = Math.max(0, bounds.minY - padding);
    let cropWidth = Math.min(image.width - cropX, contentWidth + padding * 2);
    let cropHeight = Math.min(image.height - cropY, contentHeight + padding * 2);

    // Apply maximum crop ratio constraint
    const minRetainWidth = Math.round(image.width * (1 - options.maxCropRatio));
    const minRetainHeight = Math.round(image.height * (1 - options.maxCropRatio));
    
    if (cropWidth < minRetainWidth || cropHeight < minRetainHeight) {
      // Center the content if we hit max crop limits
      const targetWidth = Math.max(cropWidth, minRetainWidth);
      const targetHeight = Math.max(cropHeight, minRetainHeight);
      
      cropX = Math.round((image.width - targetWidth) / 2);
      cropY = Math.round((image.height - targetHeight) / 2);
      cropWidth = targetWidth;
      cropHeight = targetHeight;
    }

    // Apply aspect ratio constraints if specified
    if (options.maxAspectRatio || options.minAspectRatio) {
      const currentRatio = cropWidth / cropHeight;
      
      if (options.maxAspectRatio && currentRatio > options.maxAspectRatio) {
        // Too wide - increase height
        const newHeight = Math.round(cropWidth / options.maxAspectRatio);
        const heightDiff = newHeight - cropHeight;
        cropHeight = newHeight;
        cropY = Math.max(0, cropY - Math.round(heightDiff / 2));
        
        // Ensure we don't exceed image bounds
        if (cropY + cropHeight > image.height) {
          cropY = image.height - cropHeight;
        }
      } else if (options.minAspectRatio && currentRatio < options.minAspectRatio) {
        // Too tall - increase width
        const newWidth = Math.round(cropHeight * options.minAspectRatio);
        const widthDiff = newWidth - cropWidth;
        cropWidth = newWidth;
        cropX = Math.max(0, cropX - Math.round(widthDiff / 2));
        
        // Ensure we don't exceed image bounds
        if (cropX + cropWidth > image.width) {
          cropX = image.width - cropWidth;
        }
      }
    }

    // Validate final crop bounds
    const validatedBounds = validateCropBounds(
      cropX, cropY, cropWidth, cropHeight, 
      image.width, image.height
    );

    // Use manual crop to bypass imagescript library bug
    const croppedImage = manualCrop(
      image,
      validatedBounds.x, 
      validatedBounds.y, 
      validatedBounds.width, 
      validatedBounds.height
    );

    return {
      image: croppedImage,
      metadata: {
        originalDimensions: { width: image.width, height: image.height },
        cropBounds: validatedBounds,
        appliedPadding: padding,
        processingTime: performance.now() - startTime,
        algorithmVersion: "1.0"
      }
    };
    
  } catch (error) {
    console.error('Auto-crop failed:', error);
    throw error;
  }
}