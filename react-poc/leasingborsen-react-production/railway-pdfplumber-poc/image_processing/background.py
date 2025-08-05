"""Background removal using API4.ai service"""
import aiohttp
import base64
import io
import os
from PIL import Image
from typing import Optional, Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential
import asyncio


class BackgroundRemovalError(Exception):
    """Custom exception for background removal errors"""
    pass


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True
)
async def remove_background_api4ai(
    image_base64: str,
    api_key: Optional[str] = None,
    mode: str = 'auto'
) -> str:
    """
    Remove background from image using API4.ai service.
    
    Args:
        image_base64: Base64 encoded image
        api_key: API4.ai API key (defaults to env var)
        mode: Processing mode ('auto', 'person', 'product', 'car')
    
    Returns:
        Base64 encoded image with background removed
    
    Raises:
        BackgroundRemovalError: If API call fails
    """
    if not api_key:
        api_key = os.getenv('API4AI_KEY')
        if not api_key:
            raise BackgroundRemovalError("API4AI_KEY not provided")
    
    # API4.ai endpoint
    url = 'https://api4.ai/api/v1/background'
    
    try:
        async with aiohttp.ClientSession() as session:
            # Prepare form data
            form_data = aiohttp.FormData()
            
            # Decode base64 to bytes
            image_bytes = base64.b64decode(image_base64)
            
            # Add image to form
            form_data.add_field(
                'image',
                image_bytes,
                filename='image.png',
                content_type='image/png'
            )
            
            # Add mode parameter
            form_data.add_field('mode', mode)
            
            # Make request
            async with session.post(
                url,
                headers={'X-Api-Key': api_key},
                data=form_data,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                
                # Handle rate limiting
                if response.status == 429:
                    retry_after = int(response.headers.get('Retry-After', 60))
                    await asyncio.sleep(retry_after)
                    raise BackgroundRemovalError(f"Rate limited, retry after {retry_after}s")
                
                # Check response
                if response.status != 200:
                    error_text = await response.text()
                    raise BackgroundRemovalError(
                        f"API4.ai returned status {response.status}: {error_text}"
                    )
                
                # Parse response
                result = await response.json()
                
                # Check for success
                if result.get('status', {}).get('code') != 'ok':
                    error_msg = result.get('status', {}).get('message', 'Unknown error')
                    raise BackgroundRemovalError(f"API4.ai error: {error_msg}")
                
                # Extract result image
                results = result.get('results', [])
                if not results:
                    raise BackgroundRemovalError("No results returned from API4.ai")
                
                # Get the background-removed image
                entities = results[0].get('entities', [])
                for entity in entities:
                    if entity.get('kind') == 'image' and entity.get('name') == 'result':
                        image_data = entity.get('image')
                        if image_data:
                            # If it's already base64, return it
                            if isinstance(image_data, str):
                                return image_data
                            # If it's bytes, encode to base64
                            return base64.b64encode(image_data).decode('utf-8')
                
                raise BackgroundRemovalError("No result image found in API response")
                
    except asyncio.TimeoutError:
        raise BackgroundRemovalError("API4.ai request timed out")
    except aiohttp.ClientError as e:
        raise BackgroundRemovalError(f"Network error: {str(e)}")
    except Exception as e:
        if isinstance(e, BackgroundRemovalError):
            raise
        raise BackgroundRemovalError(f"Unexpected error: {str(e)}")


async def process_with_fallback(
    image_base64: str,
    api_key: Optional[str] = None
) -> str:
    """
    Process image with fallback to different modes if car mode fails.
    
    Args:
        image_base64: Base64 encoded image
        api_key: API4.ai API key
    
    Returns:
        Base64 encoded image with background removed
    """
    modes = ['car', 'product', 'auto']
    
    for mode in modes:
        try:
            return await remove_background_api4ai(image_base64, api_key, mode)
        except BackgroundRemovalError as e:
            if mode == modes[-1]:  # Last mode
                raise
            # Try next mode
            continue
    
    raise BackgroundRemovalError("All processing modes failed")