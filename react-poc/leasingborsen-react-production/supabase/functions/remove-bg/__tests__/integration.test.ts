import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';
import { autoCropToContent } from '../auto-crop.ts';
import type { AutoCropOptions } from '../auto-crop.ts';

// Mock function to simulate the background removal process
async function mockBackgroundRemoval(imageBuffer: Uint8Array): Promise<Uint8Array> {
  // In a real scenario, this would be the API4AI response
  // For testing, we'll create a mock transparent background image with a car
  const img = new Image(1200, 900);
  
  // Fill with transparent background
  for (let y = 0; y < 900; y++) {
    for (let x = 0; x < 1200; x++) {
      img.setPixelAt(x, y, Image.rgbaToColor(0, 0, 0, 0));
    }
  }
  
  // Add car with some padding already (simulating real API4AI output)
  for (let y = 200; y < 700; y++) {
    for (let x = 300; x < 900; x++) {
      img.setPixelAt(x, y, Image.rgbaToColor(128, 128, 128, 255));
    }
  }
  
  return await img.encode();
}

// Mock the full processing pipeline
async function processCarImage(
  imageBuffer: Uint8Array, 
  options: { removeBackground: boolean; autoCrop: boolean }
): Promise<{
  processedImage: Uint8Array;
  metadata: {
    backgroundRemoved: boolean;
    autoCropped: boolean;
    cropBounds?: { x: number; y: number; width: number; height: number };
    algorithmVersion?: string;
  };
}> {
  let processedBuffer = imageBuffer;
  const metadata: any = {
    backgroundRemoved: false,
    autoCropped: false
  };
  
  // Step 1: Background removal
  if (options.removeBackground) {
    processedBuffer = await mockBackgroundRemoval(processedBuffer);
    metadata.backgroundRemoved = true;
  }
  
  // Step 2: Auto-crop
  if (options.autoCrop) {
    const img = await Image.decode(processedBuffer);
    const cropOptions: AutoCropOptions = {
      alphaThreshold: 25,
      paddingRatio: 0.15,
      minPadding: 50,
      maxCropRatio: 0.8
    };
    
    const { image: croppedImage, metadata: cropMetadata } = await autoCropToContent(img, cropOptions);
    processedBuffer = await croppedImage.encode();
    
    metadata.autoCropped = true;
    metadata.cropBounds = cropMetadata.cropBounds;
    metadata.algorithmVersion = cropMetadata.algorithmVersion;
  }
  
  return {
    processedImage: processedBuffer,
    metadata
  };
}

Deno.test("Full pipeline - background removal to auto-crop", async () => {
  // Create a mock input image
  const mockImage = new Image(1200, 900);
  // Fill with white background (simulating original photo)
  for (let y = 0; y < 900; y++) {
    for (let x = 0; x < 1200; x++) {
      mockImage.setPixelAt(x, y, Image.rgbaToColor(255, 255, 255, 255));
    }
  }
  const mockImageBuffer = await mockImage.encode();
  
  // Test full processing pipeline
  const result = await processCarImage(mockImageBuffer, {
    removeBackground: true,
    autoCrop: true
  });
  
  assertExists(result.processedImage);
  assertExists(result.metadata.cropBounds);
  assertEquals(result.metadata.algorithmVersion, "1.0");
  assertEquals(result.metadata.backgroundRemoved, true);
  assertEquals(result.metadata.autoCropped, true);
  
  // Verify the output image dimensions are smaller than input
  const outputImage = await Image.decode(result.processedImage);
  assert(outputImage.width < 1200);
  assert(outputImage.height < 900);
});

Deno.test("Pipeline - auto-crop only (no background removal)", async () => {
  // Create image with transparent background already
  const img = new Image(1000, 800);
  
  // Fill with transparent background
  for (let y = 0; y < 800; y++) {
    for (let x = 0; x < 1000; x++) {
      img.setPixelAt(x, y, Image.rgbaToColor(0, 0, 0, 0));
    }
  }
  
  // Add car content
  for (let y = 100; y < 700; y++) {
    for (let x = 200; x < 800; x++) {
      img.setPixelAt(x, y, Image.rgbaToColor(128, 128, 128, 255));
    }
  }
  
  const imageBuffer = await img.encode();
  
  const result = await processCarImage(imageBuffer, {
    removeBackground: false,
    autoCrop: true
  });
  
  assertExists(result.processedImage);
  assertEquals(result.metadata.backgroundRemoved, false);
  assertEquals(result.metadata.autoCropped, true);
  assertExists(result.metadata.cropBounds);
  
  // Verify cropping happened
  const outputImage = await Image.decode(result.processedImage);
  assert(outputImage.width < 1000);
  assert(outputImage.height < 800);
});

Deno.test("Pipeline - handles edge case with minimal content", async () => {
  // Create image with very small car
  const img = new Image(2000, 1500);
  
  // Fill with transparent background
  for (let y = 0; y < 1500; y++) {
    for (let x = 0; x < 2000; x++) {
      img.setPixelAt(x, y, Image.rgbaToColor(0, 0, 0, 0));
    }
  }
  
  // Add very small car (50x50)
  for (let y = 725; y < 775; y++) {
    for (let x = 975; x < 1025; x++) {
      img.setPixelAt(x, y, Image.rgbaToColor(128, 128, 128, 255));
    }
  }
  
  const imageBuffer = await img.encode();
  
  const result = await processCarImage(imageBuffer, {
    removeBackground: false,
    autoCrop: true
  });
  
  assertExists(result.processedImage);
  assertExists(result.metadata.cropBounds);
  
  const outputImage = await Image.decode(result.processedImage);
  // Should have applied minimum padding
  assert(outputImage.width >= 150); // 50 + 50*2 minimum padding
  assert(outputImage.height >= 150);
});

Deno.test("Pipeline - preserves transparency in output", async () => {
  const img = new Image(1000, 800);
  
  // Create transparent background with car
  for (let y = 0; y < 800; y++) {
    for (let x = 0; x < 1000; x++) {
      if (x >= 300 && x < 700 && y >= 200 && y < 600) {
        // Car area - opaque
        img.setPixelAt(x, y, Image.rgbaToColor(128, 128, 128, 255));
      } else {
        // Background - transparent
        img.setPixelAt(x, y, Image.rgbaToColor(0, 0, 0, 0));
      }
    }
  }
  
  const imageBuffer = await img.encode();
  
  const result = await processCarImage(imageBuffer, {
    removeBackground: false,
    autoCrop: true
  });
  
  const outputImage = await Image.decode(result.processedImage);
  
  // Check corners should still be transparent
  const [r1, g1, b1, a1] = Image.colorToRGBA(outputImage.getPixelAt(0, 0));
  assertEquals(a1, 0); // Top-left should be transparent
  
  const [r2, g2, b2, a2] = Image.colorToRGBA(outputImage.getPixelAt(outputImage.width - 1, 0));
  assertEquals(a2, 0); // Top-right should be transparent
});

Deno.test("Pipeline - error handling when no content found", async () => {
  // Create completely transparent image
  const img = new Image(1000, 800);
  
  for (let y = 0; y < 800; y++) {
    for (let x = 0; x < 1000; x++) {
      img.setPixelAt(x, y, Image.rgbaToColor(0, 0, 0, 0));
    }
  }
  
  const imageBuffer = await img.encode();
  
  const result = await processCarImage(imageBuffer, {
    removeBackground: false,
    autoCrop: true
  });
  
  assertExists(result.processedImage);
  assertEquals(result.metadata.autoCropped, true);
  
  // Should return original dimensions when no content found
  const outputImage = await Image.decode(result.processedImage);
  assertEquals(outputImage.width, 1000);
  assertEquals(outputImage.height, 800);
});