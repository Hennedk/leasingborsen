import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts';
import { autoCropToContent, type AutoCropOptions } from './auto-crop.ts';
import { fallbackAutoCrop } from './sharp-crop.ts';

interface RemoveBgRequest {
  imageData: string; // base64 encoded image
  fileName: string;
  skipAutoCrop?: boolean; // Optional flag to skip auto-crop
}

interface StandardizedImage {
  url: string;
  variant: string;
  dimensions: string;
}

interface RemoveBgResponse {
  success: boolean;
  original?: string;
  processed?: string;
  standardizedImages?: {
    grid?: StandardizedImage;
    detail?: StandardizedImage;
  };
  error?: string;
}

// Auto-crop configuration - tighter cropping like LeaseLoco
const AUTO_CROP_OPTIONS: AutoCropOptions = {
  alphaThreshold: 25,
  paddingRatio: 0.05,  // Reduced from 0.15 to 0.05 (5% padding)
  minPadding: 20,      // Reduced from 50 to 20px
  maxCropRatio: 0.9,   // Increased from 0.8 to 0.9 (allow 90% crop)
  maxAspectRatio: 3,
  minAspectRatio: 0.33
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // Apply rate limiting for general operations
  return rateLimiters.general(req, async (req) => {

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  try {
    // console.log('Starting remove-bg function...');
    
    const requestBody = await req.json();
    console.log('Received request body keys:', Object.keys(requestBody));
    
    const { imageData, fileName, skipAutoCrop }: RemoveBgRequest = requestBody;
    console.log('Received request with fileName:', fileName);
    console.log('ImageData type:', typeof imageData);
    console.log('ImageData length:', imageData?.length || 0);
    console.log('Skip auto-crop:', skipAutoCrop);
    
    // Validate inputs early
    if (!imageData || !fileName) {
      console.error('Missing required fields:', {
        hasImageData: !!imageData,
        hasFileName: !!fileName,
        imageDataType: typeof imageData,
        fileNameType: typeof fileName
      });
      return new Response(
        JSON.stringify({ 
          error: 'Missing imageData or fileName',
          details: {
            hasImageData: !!imageData,
            hasFileName: !!fileName
          }
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    
    // Detect image type from base64 data
    const imageTypeMatch = imageData.match(/^data:image\/([a-z]+);base64,/);
    const imageType = imageTypeMatch ? imageTypeMatch[1] : 'jpeg';
    const contentType = `image/${imageType}`;
    console.log('Detected image type:', imageType, 'contentType:', contentType);

    // Initialize Supabase client with service role key for storage operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // console.log('Environment check:', {
    //   hasSupabaseUrl: !!supabaseUrl,
    //   hasServiceKey: !!supabaseServiceKey,
    //   hasApi4aiKey: !!Deno.env.get('API4AI_KEY')
    // });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to buffer
    const imageBuffer = Uint8Array.from(atob(imageData.replace(/^data:image\/[a-z]+;base64,/, '')), c => c.charCodeAt(0));

    // Upload original image to Supabase Storage
    const timestamp = Date.now();
    const originalFileName = `background-removal/originals/${timestamp}-${fileName}`;
    const { data: originalUpload, error: uploadError } = await supabase.storage
      .from('images')
      .upload(originalFileName, imageBuffer, {
        contentType: contentType,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload original image: ${uploadError.message}`);
    }

    // Get API4.ai key from environment
    const api4aiKey = Deno.env.get('API4AI_KEY');
    if (!api4aiKey) {
      throw new Error('API4AI_KEY environment variable not set');
    }

    // Prepare FormData for API4.ai
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: contentType });
    formData.append('image', blob, fileName);
    
    // console.log('FormData prepared:', {
    //   blobSize: blob.size,
    //   blobType: blob.type,
    //   fileName: fileName
    // });

    // Call API4.ai background removal service via RapidAPI
    // console.log('Calling API4.ai background removal via RapidAPI...');
    // console.log('Request details:', {
    //   url: 'https://api4ai-background-removal.p.rapidapi.com/v1/results',
    //   method: 'POST',
    //   hasApiKey: !!api4aiKey,
    //   apiKeyLength: api4aiKey?.length,
    //   formDataSize: formData.get('image') ? 'has image' : 'no image'
    // });

    const api4Response = await fetch('https://cars-image-background-removal.p.rapidapi.com/v1/results', {
      method: 'POST',
      headers: {
        'X-RapidAPI-Key': api4aiKey,
        'X-RapidAPI-Host': 'cars-image-background-removal.p.rapidapi.com',
      },
      body: formData,
    });

    // console.log('API4.ai response status:', api4Response.status);
    // console.log('API4.ai response headers:', Object.fromEntries(api4Response.headers.entries()));

    if (!api4Response.ok) {
      const errorText = await api4Response.text();
      console.error('API4.ai error response:', errorText);
      throw new Error(`API4.ai request failed: ${api4Response.status} ${errorText}`);
    }

    const result = await api4Response.json();
    // console.log('API4.ai response structure:', {
    //   hasResults: 'results' in result,
    //   resultsLength: result.results?.length,
    //   // Don't log full response as it contains large base64 data
    //   firstResultStatus: result.results?.[0]?.status,
    //   originalDimensions: {
    //     width: result.results?.[0]?.width,
    //     height: result.results?.[0]?.height
    //   }
    // });

    if (!result.results || result.results.length === 0) {
      console.error('API4.ai processing failed - no results:', result);
      throw new Error('No results returned from API4.ai');
    }

    const firstResult = result.results[0];
    if (firstResult.status?.code !== 'ok') {
      console.error('API4.ai processing failed:', firstResult.status);
      throw new Error(firstResult.status?.message || 'API4.ai processing failed');
    }

    // Extract the processed image (base64) from the entities
    const imageEntity = firstResult.entities?.find((entity: any) => entity.kind === 'image');
    const processedImageBase64 = imageEntity?.image;
    
    // console.log('Processed image info:', {
    //   hasImageEntity: !!imageEntity,
    //   hasProcessedImage: !!processedImageBase64,
    //   imageLength: processedImageBase64?.length,
    //   imageStart: processedImageBase64?.substring(0, 50)
    // });

    if (!processedImageBase64) {
      console.error('No processed image found in entities. Result structure:', firstResult);
      throw new Error('No processed image found in API4.ai response');
    }

    // Convert processed image to buffer
    let processedBuffer = Uint8Array.from(atob(processedImageBase64), c => c.charCodeAt(0));
    console.log('Processed image base64 start:', processedImageBase64.substring(0, 50));
    console.log('Is PNG signature:', processedBuffer[0] === 0x89 && processedBuffer[1] === 0x50);

    // Apply auto-crop to remove whitespace (unless explicitly skipped)
    let cropMetadata = null;
    
    if (!skipAutoCrop) {
      try {
        console.log('Starting auto-crop process...');
        console.log('Buffer length before decode:', processedBuffer.length);
        
        // Use fallback auto-crop that doesn't depend on imagescript
        const { buffer: croppedBuffer, metadata } = await fallbackAutoCrop(
          processedBuffer,
          AUTO_CROP_OPTIONS
        );
        
        processedBuffer = croppedBuffer;
        cropMetadata = metadata;
        
        console.log('Auto-crop completed (fallback mode):', {
          originalDimensions: cropMetadata.originalDimensions,
          cropBounds: cropMetadata.cropBounds,
          preservedOriginal: true
        });
      } catch (cropError) {
        console.error('Auto-crop failed, using original processed image:', cropError);
        console.error('Error details:', {
          name: cropError.name,
          message: cropError.message,
          stack: cropError.stack
        });
        // Reset processedBuffer to original base64 data
        processedBuffer = Uint8Array.from(atob(processedImageBase64), c => c.charCodeAt(0));
        console.log('Reverted to original processed buffer');
      }
    } else {
      console.log('Auto-crop skipped by request parameter');
    }

    // Upload processed image to Supabase Storage
    const processedFileName = `background-removal/processed/${timestamp}-${fileName}.png`;
    const { data: processedUpload, error: processedError } = await supabase.storage
      .from('images')
      .upload(processedFileName, processedBuffer, {
        contentType: 'image/png',
      });

    if (processedError) {
      console.error('Processed upload error:', processedError);
      throw new Error(`Failed to upload processed image: ${processedError.message}`);
    }

    // Standardize images to grid and detail sizes
    const standardizedImages: RemoveBgResponse['standardizedImages'] = {};
    
    try {
      // console.log('Starting image standardization...');
      
      // Define standard sizes with higher resolution and tighter aspect ratio
      const sizes = {
        grid: { width: 800, height: 450 },     // 16:9 aspect ratio for tighter crop
        detail: { width: 1920, height: 1080 }  // Full HD 16:9 aspect ratio
      };
      
      // Load the processed image for standardization
      const sourceImage = await Image.decode(processedBuffer);
      
      for (const [variant, dimensions] of Object.entries(sizes)) {
        // console.log(`Creating ${variant} variant: ${dimensions.width}x${dimensions.height}`);
        
        // Create new image with transparent background
        const targetImage = new Image(dimensions.width, dimensions.height);
        
        // Calculate scale to fit image with minimal padding for tight crop
        const padding = 0.02;  // Only 2% padding for very tight crop
        const maxWidth = dimensions.width * (1 - padding * 2);
        const maxHeight = dimensions.height * (1 - padding * 2);
        
        const scale = Math.min(
          maxWidth / sourceImage.width,
          maxHeight / sourceImage.height
        );
        
        const scaledWidth = Math.round(sourceImage.width * scale);
        const scaledHeight = Math.round(sourceImage.height * scale);
        
        // Center the image
        const x = Math.round((dimensions.width - scaledWidth) / 2);
        const y = Math.round((dimensions.height - scaledHeight) / 2);
        
        // Resize the source image
        const resizedImage = sourceImage.clone().resize(scaledWidth, scaledHeight);
        
        // Composite the resized image onto the target (preserving transparency)
        targetImage.composite(resizedImage, x, y);
        
        // Convert to buffer
        const standardizedBuffer = await targetImage.encode();
        
        // Upload standardized image
        const standardizedFileName = `background-removal/${variant}/${timestamp}-${fileName}.png`;
        const { data: standardizedUpload, error: uploadError } = await supabase.storage
          .from('images')
          .upload(standardizedFileName, standardizedBuffer, {
            contentType: 'image/png',
          });
        
        if (uploadError) {
          console.error(`Error uploading ${variant} image:`, uploadError);
          continue;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(standardizedFileName);
        
        standardizedImages[variant as 'grid' | 'detail'] = {
          url: publicUrl,
          variant,
          dimensions: `${dimensions.width}x${dimensions.height}`
        };
      }
      
      // console.log('Image standardization completed');
      
    } catch (standardizationError) {
      console.error('Error during standardization:', standardizationError);
      // Continue even if standardization fails - we still have the processed image
    }

    // Get public URLs
    const { data: { publicUrl: originalUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(originalFileName);

    const { data: { publicUrl: processedUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(processedFileName);

    // Return success response
    const response: RemoveBgResponse = {
      success: true,
      original: originalUrl,
      processed: processedUrl,
      standardizedImages: Object.keys(standardizedImages).length > 0 ? standardizedImages : undefined,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Error in remove-bg function:', error);
    
    const errorResponse: RemoveBgResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
  }); // End of rate limiting wrapper
});