import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts';

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
    full?: StandardizedImage;
  };
  error?: string;
}

// Python service URL (can be overridden with environment variable)
const PYTHON_SERVICE_URL = Deno.env.get('RAILWAY_SERVICE_URL') || 'https://leasingborsen-production.up.railway.app';

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

    // Initialize Supabase client with service role key for storage operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract base64 data (remove data URL prefix if present)
    const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    
    // Call Python service for image processing
    console.log('🎨 Calling Python service for image processing...');
    
    const pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/process-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: base64Data,
        filename: fileName,
        options: {
          remove_background: true,
          auto_crop: !skipAutoCrop, // Apply auto-crop unless explicitly skipped
          add_shadow: true,
          create_sizes: true,
          padding_percent: 0.05, // 5% padding for tight crop like LeaseLoco
          quality: 85,
          format: 'WEBP'
        },
        mode: 'car'
      })
    });

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error('Python service error:', errorText);
      throw new Error(`Python service request failed: ${pythonResponse.status} ${errorText}`);
    }

    const pythonResult = await pythonResponse.json();
    
    if (!pythonResult.success) {
      console.error('Python service processing failed:', pythonResult);
      throw new Error(pythonResult.error || 'Image processing failed');
    }

    console.log('✅ Python service processing completed:', {
      hasProcessed: !!pythonResult.processed,
      hasSizes: !!pythonResult.sizes,
      metadata: pythonResult.metadata
    });

    // Convert processed images back to buffers for Supabase storage
    const timestamp = Date.now();
    const standardizedImages: RemoveBgResponse['standardizedImages'] = {};
    
    // Upload the main processed image
    if (pythonResult.processed) {
      const processedBuffer = Uint8Array.from(atob(pythonResult.processed), c => c.charCodeAt(0));
      const processedFileName = `background-removal/processed/${timestamp}-${fileName}.webp`;
      
      const { data: processedUpload, error: processedError } = await supabase.storage
        .from('images')
        .upload(processedFileName, processedBuffer, {
          contentType: 'image/webp',
        });

      if (processedError) {
        console.error('Processed upload error:', processedError);
        throw new Error(`Failed to upload processed image: ${processedError.message}`);
      }
    }

    // Upload standardized sizes if available
    if (pythonResult.sizes) {
      for (const [variant, base64Image] of Object.entries(pythonResult.sizes)) {
        try {
          const buffer = Uint8Array.from(atob(base64Image as string), c => c.charCodeAt(0));
          const standardizedFileName = `background-removal/${variant}/${timestamp}-${fileName}.webp`;
          
          const { data: standardizedUpload, error: uploadError } = await supabase.storage
            .from('images')
            .upload(standardizedFileName, buffer, {
              contentType: 'image/webp',
            });
          
          if (uploadError) {
            console.error(`Error uploading ${variant} image:`, uploadError);
            continue;
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(standardizedFileName);
          
          // Map Python service sizes to expected format
          const dimensions = {
            grid: '400x300',
            detail: '800x600',
            full: '1200x900'
          };
          
          standardizedImages[variant as keyof typeof standardizedImages] = {
            url: publicUrl,
            variant: variant,
            dimensions: dimensions[variant as keyof typeof dimensions] || 'unknown'
          };
          
          console.log(`✅ Uploaded ${variant} variant successfully`);
        } catch (uploadError) {
          console.error(`Failed to upload ${variant} variant:`, uploadError);
        }
      }
    }

    // Upload original image (for reference)
    const originalBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const originalFileName = `background-removal/originals/${timestamp}-${fileName}`;
    
    const { data: originalUpload, error: uploadError } = await supabase.storage
      .from('images')
      .upload(originalFileName, originalBuffer, {
        contentType: 'image/jpeg', // Assume JPEG for originals
      });

    if (uploadError) {
      console.error('Original upload error:', uploadError);
      // Don't throw here, original upload is not critical
    }

    // Get public URLs
    const { data: { publicUrl: originalUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(originalFileName);
      
    const { data: { publicUrl: processedUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(`background-removal/processed/${timestamp}-${fileName}.webp`);

    console.log('✅ Background removal completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        original: originalUrl,
        processed: processedUrl,
        standardizedImages,
        metadata: pythonResult.metadata
      } as RemoveBgResponse),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Background removal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to process image'
      } as RemoveBgResponse),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  }); // Close rate limiter

});