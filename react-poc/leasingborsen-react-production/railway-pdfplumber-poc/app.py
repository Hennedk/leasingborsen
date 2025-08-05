# app.py - PDFPlumber POC service for Railway
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import traceback
import io
import os
import base64
import time
from PIL import Image
from typing import Dict, Any

# Import image processing functions
from image_processing import (
    auto_crop_with_padding,
    add_drop_shadow,
    add_ground_shadow,
    add_dual_ground_shadow,
    remove_background_api4ai,
    create_image_sizes
)
from image_processing.cache import image_cache
from models import (
    ProcessImageRequest,
    ProcessImageResponse,
    ImageMetadata,
    HealthResponse,
    ShadowType
)

app = FastAPI(title="Leasingborsen Processing Service", version="2.0.0")

# Add CORS middleware for testing from browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for POC
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_model=HealthResponse)
def health_check():
    return {
        "status": "healthy",
        "service": "leasingborsen-processing",
        "version": "2.0.0",
        "features": ["pdf_extraction", "background_removal", "auto_crop", "drop_shadow", "image_resize"]
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/cache/stats")
def cache_stats():
    """Get cache statistics"""
    return image_cache.stats()

@app.post("/extract/structured")
async def extract_structured(file: UploadFile = File(...)):
    """Extract structured text from PDF for Railway integration"""
    try:
        # Read the uploaded PDF file
        content = await file.read()
        
        # Extract all text using pdfplumber
        extracted_text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                page_text = page.extract_text()
                if page_text:
                    extracted_text += f"\n--- Page {page_num} ---\n{page_text}\n"
        
        # Return the extracted text
        return JSONResponse(
            status_code=200,
            content={
                "extracted_text": extracted_text.strip(),
                "text": extracted_text.strip(),  # For backward compatibility
                "data": {
                    "extracted_text": extracted_text.strip(),
                    "text": extracted_text.strip()
                }
            }
        )
        
    except Exception as e:
        print(f"Error processing PDF: {str(e)}")
        print(traceback.format_exc())
        
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to extract text from PDF",
                "details": str(e)
            }
        )

@app.post("/process-image", response_model=ProcessImageResponse)
async def process_image(request: ProcessImageRequest):
    """
    Process car image with background removal, auto-crop, shadow, and resizing.
    """
    start_time = time.time()
    
    # Check cache first
    cache_key_data = {
        'remove_background': request.options.remove_background,
        'auto_crop': request.options.auto_crop,
        'add_shadow': request.options.add_shadow,
        'create_sizes': request.options.create_sizes,
        'shadow_offset': request.options.shadow_offset,
        'shadow_blur': request.options.shadow_blur,
        'padding_percent': request.options.padding_percent,
        'quality': request.options.quality,
        'format': request.options.format,
        'mode': request.mode.value
    }
    
    cached_result = image_cache.get(request.image_base64, cache_key_data)
    if cached_result:
        # Add cache hit info to metadata
        if 'metadata' in cached_result and isinstance(cached_result['metadata'], dict):
            cached_result['metadata']['cache_hit'] = True
            cached_result['metadata']['processing_time_ms'] = int((time.time() - start_time) * 1000)
        return ProcessImageResponse(**cached_result)
    
    try:
        # Decode base64 image
        try:
            image_bytes = base64.b64decode(request.image_base64)
            image = Image.open(io.BytesIO(image_bytes))
            original_size = list(image.size)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")
        
        # Track what was done
        metadata = {
            "original_size": original_size,
            "has_background_removed": False,
            "has_shadow": False,
            "was_cropped": False,
            "format": request.options.format
        }
        
        # Step 1: Remove background if requested
        if request.options.remove_background:
            try:
                # Convert current image to base64 for API
                buffer = io.BytesIO()
                image.save(buffer, format='PNG')
                current_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                
                # Call API with fg-image mode for cars
                # Map our modes to the cars API mode
                api_mode = "fg-image"  # Always use fg-image for foreground extraction
                result_base64 = await remove_background_api4ai(
                    current_base64,
                    mode=api_mode
                )
                
                # Convert back to PIL Image
                image_bytes = base64.b64decode(result_base64)
                image = Image.open(io.BytesIO(image_bytes))
                metadata["has_background_removed"] = True
                
            except Exception as e:
                print(f"Background removal failed: {str(e)}")
                # Continue with original image
        
        # Step 2: Auto-crop if requested
        if request.options.auto_crop:
            try:
                cropped = auto_crop_with_padding(
                    image,
                    padding_percent=request.options.padding_percent
                )
                if cropped.size != image.size:
                    image = cropped
                    metadata["was_cropped"] = True
            except Exception as e:
                print(f"Auto-crop failed: {str(e)}")
        
        # Step 3: Add shadow if requested
        if request.options.add_shadow:
            try:
                if request.options.shadow_type == ShadowType.DROP:
                    # Traditional drop shadow
                    image = add_drop_shadow(
                        image,
                        offset=request.options.shadow_offset,
                        blur_radius=request.options.shadow_blur
                    )
                elif request.options.shadow_type == ShadowType.GROUND:
                    # Single elliptical ground shadow
                    image = add_ground_shadow(
                        image,
                        shadow_height_ratio=request.options.shadow_height_ratio,
                        shadow_width_ratio=request.options.shadow_width_ratio,
                        offset=(0, 3),  # Minimal offset for ground shadow
                        blur_radius=35,  # Higher blur for realism
                        opacity_center=request.options.shadow_opacity_center,
                        opacity_edge=request.options.shadow_opacity_edge
                    )
                elif request.options.shadow_type == ShadowType.DUAL_GROUND:
                    # Dual ground shadows under wheels
                    image = add_dual_ground_shadow(
                        image,
                        wheel_spacing_ratio=request.options.wheel_spacing_ratio,
                        shadow_size_ratio=request.options.shadow_size_ratio,
                        offset=(0, 3),
                        blur_radius=30,
                        opacity_center=request.options.shadow_opacity_center,
                        opacity_edge=request.options.shadow_opacity_edge
                    )
                
                metadata["has_shadow"] = True
                metadata["shadow_type"] = request.options.shadow_type.value
            except Exception as e:
                print(f"Shadow application failed: {str(e)}")
        
        metadata["final_size"] = list(image.size)
        
        # Step 4: Create different sizes if requested
        sizes = {}
        if request.options.create_sizes:
            try:
                sizes = create_image_sizes(
                    image,
                    quality=request.options.quality,
                    format=request.options.format
                )
            except Exception as e:
                print(f"Resize failed: {str(e)}")
        
        # Convert final image to base64
        buffer = io.BytesIO()
        save_kwargs = {'format': request.options.format}
        if request.options.format in ['JPEG', 'WEBP']:
            save_kwargs['quality'] = request.options.quality
            save_kwargs['optimize'] = True
        
        image.save(buffer, **save_kwargs)
        processed_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)
        metadata["processing_time_ms"] = processing_time
        
        # Create response
        response_data = {
            "success": True,
            "processed": processed_base64,
            "sizes": sizes or None,
            "metadata": metadata
        }
        
        # Cache the result
        image_cache.set(request.image_base64, cache_key_data, response_data)
        
        return ProcessImageResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Image processing error: {str(e)}")
        print(traceback.format_exc())
        
        return ProcessImageResponse(
            success=False,
            error=f"Processing failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)