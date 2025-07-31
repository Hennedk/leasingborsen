import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts';

interface RemoveBgRequest {
  imageData: string; // base64 encoded image
  fileName: string;
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
    
    const { imageData, fileName }: RemoveBgRequest = await req.json();
    // console.log('Received request with fileName:', fileName);
    
    // Detect image type from base64 data
    const imageTypeMatch = imageData.match(/^data:image\/([a-z]+);base64,/);
    const imageType = imageTypeMatch ? imageTypeMatch[1] : 'jpeg';
    const contentType = `image/${imageType}`;
    // console.log('Detected image type:', imageType, 'contentType:', contentType);

    if (!imageData || !fileName) {
      console.error('Missing imageData or fileName');
      return new Response(
        JSON.stringify({ error: 'Missing imageData or fileName' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

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
    const originalFileName = `original-${Date.now()}-${fileName}`;
    const { data: originalUpload, error: uploadError } = await supabase.storage
      .from('poc-originals')
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
    const processedBuffer = Uint8Array.from(atob(processedImageBase64), c => c.charCodeAt(0));

    // Upload processed image to Supabase Storage
    const processedFileName = `processed-${Date.now()}-${fileName}.png`;
    const { data: processedUpload, error: processedError } = await supabase.storage
      .from('poc-processed')
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
      
      // Define standard sizes with higher resolution
      const sizes = {
        grid: { width: 800, height: 500 },     // Doubled from 400x250
        detail: { width: 1600, height: 800 }   // Doubled from 800x400
      };
      
      // Load the processed image for standardization
      const sourceImage = await Image.decode(processedBuffer);
      
      for (const [variant, dimensions] of Object.entries(sizes)) {
        // console.log(`Creating ${variant} variant: ${dimensions.width}x${dimensions.height}`);
        
        // Create new image with transparent background
        const targetImage = new Image(dimensions.width, dimensions.height);
        
        // Calculate scale to fit image with 5% padding
        const padding = 0.05;
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
        const standardizedFileName = `${variant}/${variant}-${Date.now()}-${fileName}.png`;
        const { data: standardizedUpload, error: uploadError } = await supabase.storage
          .from('poc-processed')
          .upload(standardizedFileName, standardizedBuffer, {
            contentType: 'image/png',
          });
        
        if (uploadError) {
          console.error(`Error uploading ${variant} image:`, uploadError);
          continue;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('poc-processed')
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
      .from('poc-originals')
      .getPublicUrl(originalFileName);

    const { data: { publicUrl: processedUrl } } = supabase.storage
      .from('poc-processed')
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