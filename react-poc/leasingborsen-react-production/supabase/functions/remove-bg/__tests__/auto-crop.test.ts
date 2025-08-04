import { assertEquals, assertExists, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';
import { findContentBounds, autoCropToContent, validateCropBounds, manualCrop } from '../auto-crop.ts';
import type { ContentBounds, AutoCropOptions, CropMetadata } from '../auto-crop.ts';

// Test data generators
function createTestImage(width: number, height: number, carBounds: {x: number, y: number, w: number, h: number}): Image {
  const img = new Image(width, height);
  
  // Fill with transparent background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      img.setPixelAt(x, y, Image.rgbaToColor(0, 0, 0, 0));
    }
  }
  
  // Add opaque rectangle representing car
  for (let y = carBounds.y; y < carBounds.y + carBounds.h && y < height; y++) {
    for (let x = carBounds.x; x < carBounds.x + carBounds.w && x < width; x++) {
      img.setPixelAt(x, y, Image.rgbaToColor(128, 128, 128, 255)); // Gray car
    }
  }
  
  return img;
}

// Create test image with semi-transparent edges (anti-aliasing simulation)
function createTestImageWithSoftEdges(width: number, height: number, carBounds: {x: number, y: number, w: number, h: number}): Image {
  const img = createTestImage(width, height, carBounds);
  
  // Add semi-transparent pixels around edges
  const edgeWidth = 2;
  for (let y = carBounds.y - edgeWidth; y < carBounds.y + carBounds.h + edgeWidth && y < height && y >= 0; y++) {
    for (let x = carBounds.x - edgeWidth; x < carBounds.x + carBounds.w + edgeWidth && x < width && x >= 0; x++) {
      const distFromEdge = Math.min(
        Math.abs(x - carBounds.x),
        Math.abs(x - (carBounds.x + carBounds.w - 1)),
        Math.abs(y - carBounds.y),
        Math.abs(y - (carBounds.y + carBounds.h - 1))
      );
      
      if (distFromEdge < edgeWidth && distFromEdge >= 0) {
        const alpha = Math.round((1 - distFromEdge / edgeWidth) * 100);
        if (alpha > 0) {
          img.setPixelAt(x, y, Image.rgbaToColor(128, 128, 128, alpha));
        }
      }
    }
  }
  
  return img;
}

// Test cases for findContentBounds
Deno.test("findContentBounds - finds car in centered image", async () => {
  const img = createTestImage(1000, 800, {x: 200, y: 150, w: 600, h: 500});
  const bounds = await findContentBounds(img, 25);
  
  assertExists(bounds);
  assertEquals(bounds!.minX, 200);
  assertEquals(bounds!.minY, 150);
  assertEquals(bounds!.maxX, 799);
  assertEquals(bounds!.maxY, 649);
});

Deno.test("findContentBounds - handles edge-touching content", async () => {
  const img = createTestImage(1000, 800, {x: 0, y: 0, w: 1000, h: 800});
  const bounds = await findContentBounds(img, 25);
  
  assertExists(bounds);
  assertEquals(bounds!.minX, 0);
  assertEquals(bounds!.minY, 0);
  assertEquals(bounds!.maxX, 999);
  assertEquals(bounds!.maxY, 799);
});

Deno.test("findContentBounds - returns null for empty image", async () => {
  const img = createTestImage(1000, 800, {x: 0, y: 0, w: 0, h: 0});
  const bounds = await findContentBounds(img, 25);
  
  assertEquals(bounds, null);
});

Deno.test("findContentBounds - handles semi-transparent edges", async () => {
  const img = createTestImageWithSoftEdges(1000, 800, {x: 200, y: 150, w: 600, h: 500});
  
  // With low threshold, should include soft edges
  const boundsLow = await findContentBounds(img, 25);
  assertExists(boundsLow);
  assert(boundsLow!.minX <= 200);
  assert(boundsLow!.minY <= 150);
  
  // With high threshold, should exclude soft edges
  const boundsHigh = await findContentBounds(img, 200);
  assertExists(boundsHigh);
  assert(boundsHigh!.minX >= 200);
  assert(boundsHigh!.minY >= 150);
});

// Test cases for validateCropBounds
Deno.test("validateCropBounds - returns valid bounds unchanged", () => {
  const result = validateCropBounds(100, 100, 200, 200, 1000, 800);
  
  assertEquals(result.x, 100);
  assertEquals(result.y, 100);
  assertEquals(result.width, 200);
  assertEquals(result.height, 200);
});

Deno.test("validateCropBounds - clamps negative coordinates", () => {
  const result = validateCropBounds(-50, -50, 200, 200, 1000, 800);
  
  assertEquals(result.x, 0);
  assertEquals(result.y, 0);
  assertEquals(result.width, 200);
  assertEquals(result.height, 200);
});

Deno.test("validateCropBounds - reduces size when exceeding bounds", () => {
  const result = validateCropBounds(900, 700, 200, 200, 1000, 800);
  
  assertEquals(result.x, 900);
  assertEquals(result.y, 700);
  assertEquals(result.width, 100); // Reduced from 200
  assertEquals(result.height, 100); // Reduced from 200
});

// Test cases for autoCropToContent
Deno.test("autoCropToContent - applies correct padding", async () => {
  const img = createTestImage(1000, 800, {x: 200, y: 150, w: 600, h: 500});
  const options: AutoCropOptions = {
    alphaThreshold: 25,
    paddingRatio: 0.15,
    minPadding: 50,
    maxCropRatio: 0.8
  };
  
  const result = await autoCropToContent(img, options);
  assertExists(result);
  
  // Expected: 15% of 600 = 90px padding
  const expectedPadding = Math.round(600 * 0.15);
  assertEquals(result.image.width, 600 + expectedPadding * 2); // 600 + 90*2 = 780
  assertEquals(result.image.height, 500 + expectedPadding * 2); // 500 + 90*2 = 680
});

Deno.test("autoCropToContent - respects minimum padding", async () => {
  const img = createTestImage(1000, 800, {x: 450, y: 375, w: 100, h: 50});
  const options: AutoCropOptions = {
    alphaThreshold: 25,
    paddingRatio: 0.15,
    minPadding: 50,
    maxCropRatio: 0.8
  };
  
  const result = await autoCropToContent(img, options);
  assertExists(result);
  
  // Expected: minPadding of 50px (larger than 15% of 100 = 15px)
  assertEquals(result.image.width, 200); // 100 + 50*2
  assertEquals(result.image.height, 150); // 50 + 50*2
});

Deno.test("autoCropToContent - enforces maximum crop ratio", async () => {
  const img = createTestImage(1000, 800, {x: 100, y: 100, w: 50, h: 50});
  const options: AutoCropOptions = {
    alphaThreshold: 25,
    paddingRatio: 0.15,
    minPadding: 50,
    maxCropRatio: 0.8
  };
  
  const result = await autoCropToContent(img, options);
  assertExists(result);
  
  // Should not crop more than 80%
  assert(result.image.width >= 200); // 1000 * 0.2
  assert(result.image.height >= 160); // 800 * 0.2
});

Deno.test("autoCropToContent - handles aspect ratio constraints", async () => {
  const img = createTestImage(1000, 800, {x: 100, y: 350, w: 800, h: 100});
  const options: AutoCropOptions = {
    alphaThreshold: 25,
    paddingRatio: 0.15,
    minPadding: 50,
    maxCropRatio: 0.8,
    maxAspectRatio: 3,
    minAspectRatio: 0.33
  };
  
  const result = await autoCropToContent(img, options);
  assertExists(result);
  
  const aspectRatio = result.image.width / result.image.height;
  assert(aspectRatio <= 3, `Aspect ratio ${aspectRatio} exceeds max`);
  assert(aspectRatio >= 0.33, `Aspect ratio ${aspectRatio} below min`);
});

Deno.test("autoCropToContent - returns original for empty image", async () => {
  const img = createTestImage(1000, 800, {x: 0, y: 0, w: 0, h: 0});
  const options: AutoCropOptions = {
    alphaThreshold: 25,
    paddingRatio: 0.15,
    minPadding: 50,
    maxCropRatio: 0.8
  };
  
  const result = await autoCropToContent(img, options);
  assertExists(result);
  
  // Should return original dimensions
  assertEquals(result.image.width, 1000);
  assertEquals(result.image.height, 800);
  assertEquals(result.metadata.appliedPadding, 0);
});

Deno.test("autoCropToContent - handles car at image edge", async () => {
  const img = createTestImage(1000, 800, {x: 0, y: 0, w: 100, h: 100});
  const options: AutoCropOptions = {
    alphaThreshold: 25,
    paddingRatio: 0.15,
    minPadding: 50,
    maxCropRatio: 0.8
  };
  
  const result = await autoCropToContent(img, options);
  assertExists(result);
  
  // Should still add padding where possible
  assert(result.image.width >= 150); // 100 + 50 (right padding)
  assert(result.image.height >= 150); // 100 + 50 (bottom padding)
});

Deno.test("autoCropToContent - handles full-width car", async () => {
  const img = createTestImage(1000, 800, {x: 0, y: 300, w: 1000, h: 200});
  const options: AutoCropOptions = {
    alphaThreshold: 25,
    paddingRatio: 0.15,
    minPadding: 50,
    maxCropRatio: 0.8
  };
  
  const result = await autoCropToContent(img, options);
  assertExists(result);
  
  // Width should remain 1000 (no horizontal cropping possible)
  assertEquals(result.image.width, 1000);
  // Height should be cropped with padding
  assert(result.image.height < 800);
  assert(result.image.height >= 300); // 200 + 50*2
});

Deno.test("autoCropToContent - applies tight crop for LeaseLoco style", async () => {
  const img = createTestImage(1000, 800, {x: 200, y: 150, w: 600, h: 500});
  const options: AutoCropOptions = {
    alphaThreshold: 25,
    paddingRatio: 0.05, // 5% padding for tight crop
    minPadding: 20, // 20px minimum
    maxCropRatio: 0.9 // Can crop up to 90%
  };
  
  const result = await autoCropToContent(img, options);
  assertExists(result);
  
  // Expected: 5% of 600 = 30px padding
  const expectedPadding = Math.round(600 * 0.05);
  assertEquals(result.image.width, 600 + expectedPadding * 2); // 600 + 30*2 = 660
  assertEquals(result.image.height, 500 + expectedPadding * 2); // 500 + 30*2 = 560
});

Deno.test("autoCropToContent - handles edge case dimensions", async () => {
  const img = createTestImage(1000, 800, {x: 999, y: 799, w: 1, h: 1});
  const options: AutoCropOptions = {
    alphaThreshold: 25,
    paddingRatio: 0.15,
    minPadding: 50,
    maxCropRatio: 0.8
  };
  
  const result = await autoCropToContent(img, options);
  assertExists(result);
  
  // Should handle edge constraints properly
  assert(result.metadata.cropBounds.x + result.metadata.cropBounds.width <= 1000);
  assert(result.metadata.cropBounds.y + result.metadata.cropBounds.height <= 800);
});

Deno.test("autoCropToContent - metadata contains correct information", async () => {
  const img = createTestImage(1000, 800, {x: 200, y: 150, w: 600, h: 500});
  const options: AutoCropOptions = {
    alphaThreshold: 25,
    paddingRatio: 0.15,
    minPadding: 50,
    maxCropRatio: 0.8
  };
  
  const result = await autoCropToContent(img, options);
  assertExists(result);
  assertExists(result.metadata);
  
  assertEquals(result.metadata.originalDimensions.width, 1000);
  assertEquals(result.metadata.originalDimensions.height, 800);
  assertEquals(result.metadata.algorithmVersion, "1.0");
  assert(result.metadata.processingTime >= 0);
  assert(result.metadata.appliedPadding > 0);
});

// Test manual crop function
Deno.test("manualCrop - basic functionality", () => {
  const img = createTestImage(100, 100, {x: 20, y: 20, w: 60, h: 60});
  
  // Test basic crop
  const cropped = manualCrop(img, 10, 10, 80, 80);
  assertEquals(cropped.width, 80);
  assertEquals(cropped.height, 80);
  
  // Check that pixels were copied correctly
  // Pixel at (20,20) in original should be at (10,10) in cropped
  const originalPixel = img.getPixelAt(20, 20);
  const croppedPixel = cropped.getPixelAt(10, 10);
  assertEquals(croppedPixel, originalPixel);
});

Deno.test("manualCrop - handles out of bounds", () => {
  const img = createTestImage(100, 100, {x: 20, y: 20, w: 60, h: 60});
  
  // Try to crop beyond image bounds
  const cropped = manualCrop(img, 50, 50, 100, 100);
  assertEquals(cropped.width, 100);
  assertEquals(cropped.height, 100);
  
  // Pixels outside source should be transparent (not throw error)
  const outsidePixel = cropped.getPixelAt(60, 60);
  // Check alpha channel is 0 (transparent)
  const [r, g, b, a] = Image.colorToRGBA(outsidePixel);
  assertEquals(a, 0);
});

Deno.test("manualCrop - can encode without errors", async () => {
  const img = createTestImage(200, 200, {x: 50, y: 50, w: 100, h: 100});
  
  // Crop the image
  const cropped = manualCrop(img, 25, 25, 150, 150);
  
  // This should not throw an error
  let encoded;
  let error = null;
  try {
    encoded = await cropped.encode();
  } catch (e) {
    error = e;
  }
  
  assertEquals(error, null);
  assertExists(encoded);
  assert(encoded instanceof Uint8Array);
});

// Performance test
Deno.test("autoCropToContent - performance", async () => {
  const img = createTestImage(3000, 2000, {x: 500, y: 400, w: 2000, h: 1200});
  const options: AutoCropOptions = {
    alphaThreshold: 25,
    paddingRatio: 0.15,
    minPadding: 50,
    maxCropRatio: 0.8
  };
  
  const startTime = performance.now();
  const result = await autoCropToContent(img, options);
  const endTime = performance.now();
  
  assertExists(result);
  
  const processingTime = endTime - startTime;
  console.log(`Processing time for 3000x2000 image: ${processingTime.toFixed(2)}ms`);
  
  // Should complete in reasonable time (< 2000ms with manual crop)
  assert(processingTime < 2000, `Processing took too long: ${processingTime}ms`);
});