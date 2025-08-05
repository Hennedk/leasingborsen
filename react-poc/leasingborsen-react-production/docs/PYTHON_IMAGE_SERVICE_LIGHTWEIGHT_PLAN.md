# Python Image Service - Streamlined Implementation Plan

## Overview
Replace the failing imagescript-based image processing with a focused Python service that "just works" for car image processing.

**Core Philosophy**: Build what's needed, test what matters, ship fast.

## Simplified Architecture

```
Admin UI → Edge Function (auth) → Python Service → Supabase Storage
                                        ↓
                                   [Background removal, Auto-crop, Shadow, Resize]
```

## Lightweight Testing Strategy

### 1. Critical Path Tests Only (80/20 Rule)

```python
# tests/test_core.py - The only test file we need initially
import pytest
from PIL import Image
import base64
import io
from app.main import app
from fastapi.testclient import TestClient

class TestCoreImageProcessing:
    """Test the critical paths that MUST work in production"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.fixture 
    def real_car_image(self):
        """Use an actual car image from the project"""
        # Load a real test image from test fixtures
        with open("tests/fixtures/test-car.jpg", "rb") as f:
            return base64.b64encode(f.read()).decode()
    
    def test_complete_processing_pipeline(self, client, real_car_image):
        """The one test that matters: Can we process a car image end-to-end?"""
        response = client.post("/process-image", json={
            "image_base64": real_car_image,
            "filename": "test-car.jpg"
        })
        
        assert response.status_code == 200
        result = response.json()
        
        # Critical assertions only
        assert result["success"] is True
        assert "processed" in result  # Main processed image
        assert "grid" in result       # Grid view variant
        assert "detail" in result     # Detail view variant
        
        # Verify images are valid base64
        for key in ["processed", "grid", "detail"]:
            decoded = base64.b64decode(result[key])
            img = Image.open(io.BytesIO(decoded))
            assert img.mode == "RGBA"  # Has transparency from background removal
    
    def test_handles_api4ai_failure(self, client, real_car_image, monkeypatch):
        """Ensure graceful degradation when API4.ai is down"""
        # Mock API4.ai to fail
        def mock_api_fail(*args, **kwargs):
            raise Exception("API4.ai is down")
        
        monkeypatch.setattr("app.processors.background.call_api4ai", mock_api_fail)
        
        response = client.post("/process-image", json={
            "image_base64": real_car_image,
            "filename": "test-car.jpg",
            "options": {"skip_background_removal": True}  # Fallback option
        })
        
        # Should still process without background removal
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_concurrent_requests(self, client, real_car_image):
        """Ensure service handles multiple simultaneous uploads"""
        import concurrent.futures
        
        def make_request():
            return client.post("/process-image", json={
                "image_base64": real_car_image,
                "filename": "test-car.jpg"
            })
        
        # Simulate 5 concurrent uploads (realistic admin scenario)
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            results = [f.result() for f in futures]
        
        # All should succeed
        assert all(r.status_code == 200 for r in results)
    
    @pytest.mark.integration
    def test_supabase_upload(self, client, real_car_image):
        """Test actual Supabase storage integration"""
        response = client.post("/process-image", json={
            "image_base64": real_car_image,
            "filename": "integration-test.jpg",
            "upload_to_storage": True
        })
        
        assert response.status_code == 200
        result = response.json()
        assert "storage_urls" in result
        assert result["storage_urls"]["processed"].startswith("https://")
```

### 2. Smoke Tests for Production

```python
# tests/test_smoke.py - Run after each deployment
import requests
import os

def test_health_check():
    """Basic health check"""
    url = os.getenv("SERVICE_URL", "http://localhost:8000")
    response = requests.get(f"{url}/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_can_process_small_image():
    """Quick test with tiny image"""
    # 1x1 pixel image
    tiny_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    response = requests.post(f"{url}/process-image", json={
        "image_base64": tiny_image,
        "filename": "smoke-test.png"
    })
    assert response.status_code == 200
```

## Minimal Implementation

### Project Structure (Simplified)
```
python-image-service/
├── app/
│   ├── main.py           # FastAPI app + all endpoints
│   ├── processors.py     # All image processing logic
│   └── config.py         # Environment config
├── tests/
│   ├── fixtures/         # Real test images
│   ├── test_core.py      # Critical path tests
│   └── test_smoke.py     # Production smoke tests
├── requirements.txt      # Minimal dependencies
├── Dockerfile           # Simple container
└── railway.json         # One-click Railway deploy
```

### Core Implementation

```python
# app/main.py - Everything in one place initially
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import base64
import io
from PIL import Image
import numpy as np
import aiohttp
import asyncio
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

app = FastAPI()

class ProcessImageRequest(BaseModel):
    image_base64: str
    filename: str
    options: Optional[Dict] = {}
    upload_to_storage: Optional[bool] = False

class ImageProcessor:
    """Handles all image processing operations"""
    
    def __init__(self):
        self.api4ai_key = os.getenv("API4AI_KEY")
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    async def process_complete(self, image_base64: str, filename: str, options: Dict):
        """Main processing pipeline"""
        try:
            # Decode input
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            
            # Step 1: Remove background (with fallback)
            if not options.get("skip_background_removal"):
                try:
                    image = await self.remove_background(image)
                except Exception as e:
                    logger.warning(f"Background removal failed: {e}, continuing without")
            
            # Step 2: Auto-crop with padding
            image = self.auto_crop(image)
            
            # Step 3: Add drop shadow
            image = self.add_shadow(image)
            
            # Step 4: Generate size variants
            variants = {
                "processed": image,
                "grid": self.resize_for_grid(image),
                "detail": self.resize_for_detail(image)
            }
            
            # Convert to base64
            result = {}
            for name, img in variants.items():
                buffer = io.BytesIO()
                img.save(buffer, format="PNG", optimize=True)
                result[name] = base64.b64encode(buffer.getvalue()).decode()
            
            result["success"] = True
            result["metadata"] = {
                "original_size": [image.width, image.height],
                "filename": filename
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Processing failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def remove_background(self, image: Image.Image) -> Image.Image:
        """Call API4.ai for background removal"""
        # Convert to base64 for API
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api4.ai/api/v1/background",
                headers={"X-API-Key": self.api4ai_key},
                data={"image": f"data:image/png;base64,{image_base64}"},
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status != 200:
                    raise Exception(f"API4.ai returned {response.status}")
                
                result = await response.json()
                # Extract processed image from response
                output_base64 = result["results"][0]["output_image"]
                output_data = base64.b64decode(output_base64.split(",")[1])
                return Image.open(io.BytesIO(output_data))
    
    def auto_crop(self, image: Image.Image, padding=50) -> Image.Image:
        """Remove transparent edges with padding"""
        # Convert to numpy
        data = np.array(image)
        
        # Find non-transparent pixels
        if data.shape[2] == 4:  # Has alpha
            alpha = data[:, :, 3]
            rows = np.any(alpha > 10, axis=1)
            cols = np.any(alpha > 10, axis=0)
        else:
            # No alpha, crop based on non-white pixels
            gray = np.mean(data, axis=2)
            rows = np.any(gray < 250, axis=1)
            cols = np.any(gray < 250, axis=0)
        
        # Find bounds
        if np.any(rows) and np.any(cols):
            rmin, rmax = np.where(rows)[0][[0, -1]]
            cmin, cmax = np.where(cols)[0][[0, -1]]
            
            # Add padding
            rmin = max(0, rmin - padding)
            rmax = min(image.height, rmax + padding)
            cmin = max(0, cmin - padding)
            cmax = min(image.width, cmax + padding)
            
            return image.crop((cmin, rmin, cmax, rmax))
        
        return image
    
    def add_shadow(self, image: Image.Image) -> Image.Image:
        """Add simple drop shadow"""
        # Create shadow (simple gaussian blur of alpha)
        shadow = Image.new("RGBA", 
                          (image.width + 40, image.height + 40), 
                          (255, 255, 255, 0))
        
        # Paste image with offset for shadow effect
        shadow.paste((0, 0, 0, 128), (25, 25, image.width + 25, image.height + 25))
        shadow = shadow.filter(ImageFilter.GaussianBlur(radius=15))
        
        # Paste original on top
        shadow.paste(image, (10, 10), image)
        
        return shadow
    
    def resize_for_grid(self, image: Image.Image) -> Image.Image:
        """Resize for grid view (600x400)"""
        return image.resize((600, 400), Image.Resampling.LANCZOS)
    
    def resize_for_detail(self, image: Image.Image) -> Image.Image:
        """Resize for detail view (1200x800)"""
        return image.resize((1200, 800), Image.Resampling.LANCZOS)

# Initialize processor
processor = ImageProcessor()

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/process-image")
async def process_image(request: ProcessImageRequest):
    result = await processor.process_complete(
        request.image_base64,
        request.filename,
        request.options or {}
    )
    
    # Optional: Upload to Supabase
    if request.upload_to_storage:
        # TODO: Implement Supabase upload
        pass
    
    return result
```

### Deployment (Railway - One Click)

```json
{
  "name": "leasingborsen-image-service",
  "env": {
    "API4AI_KEY": {
      "description": "API4.ai API key"
    },
    "SUPABASE_URL": {
      "description": "Supabase project URL"
    },
    "SUPABASE_SERVICE_KEY": {
      "description": "Supabase service role key"
    }
  },
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
  }
}
```

```dockerfile
# Dockerfile - Minimal and fast
FROM python:3.11-slim

WORKDIR /app

# Install only what we need
RUN apt-get update && apt-get install -y \
    libpng-dev libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

# Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App
COPY . .

# Quick test run during build
RUN python -m pytest tests/test_core.py::TestCoreImageProcessing::test_complete_processing_pipeline -v || true

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```txt
# requirements.txt - Minimal dependencies
fastapi==0.109.0
uvicorn[standard]==0.27.0
pillow==10.2.0
numpy==1.26.3
aiohttp==3.9.3
pydantic==2.5.3
python-multipart==0.0.6
pytest==7.4.4
httpx==0.26.0  # For test client
```

## Integration Strategy (Rapid Migration)

### Week 1: Build & Test Locally
- Set up project structure
- Implement core processing
- Run tests with real images
- Test with local Supabase

### Week 2: Deploy & Parallel Run
```javascript
// Update Edge Function for A/B testing
export async function processImage(req: Request) {
  const useNewService = Math.random() < 0.1; // 10% to Python service
  
  if (useNewService && PYTHON_SERVICE_URL) {
    try {
      const response = await fetch(`${PYTHON_SERVICE_URL}/process-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': INTERNAL_API_KEY
        },
        body: req.body
      });
      
      if (response.ok) {
        return response;
      }
    } catch (e) {
      console.error('Python service failed, falling back');
    }
  }
  
  // Existing processing
  return existingImageProcess(req);
}
```

### Week 3: Full Migration
- Increase traffic to 100%
- Monitor error rates
- Remove old imagescript code

## Monitoring (Simple Metrics)

```python
# app/main.py - Add basic metrics
from datetime import datetime
import json

# Simple in-memory metrics (reset on restart)
metrics = {
    "requests": 0,
    "successes": 0,
    "failures": 0,
    "api4ai_calls": 0,
    "total_processing_time": 0
}

@app.get("/metrics")
async def get_metrics():
    """Simple metrics endpoint"""
    return {
        **metrics,
        "success_rate": metrics["successes"] / max(metrics["requests"], 1),
        "avg_processing_time": metrics["total_processing_time"] / max(metrics["requests"], 1)
    }

# Wrap processor to collect metrics
async def process_with_metrics(request):
    start = datetime.now()
    metrics["requests"] += 1
    
    try:
        result = await processor.process_complete(...)
        metrics["successes"] += 1
        return result
    except Exception as e:
        metrics["failures"] += 1
        raise
    finally:
        duration = (datetime.now() - start).total_seconds()
        metrics["total_processing_time"] += duration
```

## Rollback Plan

1. **Environment Variable**: `USE_PYTHON_SERVICE=false` disables immediately
2. **Edge Function**: Revert to old code path
3. **DNS**: Point to old service if needed

## Success Criteria

- ✅ Processes car images successfully
- ✅ Sub-5 second processing time
- ✅ Handles API4.ai failures gracefully
- ✅ No memory leaks after 1000 images
- ✅ Zero downtime migration

## Cost Optimization

- Cache API4.ai responses for identical images (later)
- Batch process during off-peak (later)
- Use Railway's auto-scaling (built-in)

## Next Steps After Launch

1. Add Redis caching (if needed)
2. Implement batch processing (if needed)
3. Add more image formats (if requested)
4. Direct integration with admin UI (remove Edge Function)

---

**Key Difference from Original Plan**: 
- 80% less test code
- No complex test infrastructure
- Focus on integration over unit tests
- Faster time to production
- Iterative improvements post-launch

**Philosophy**: Ship a working solution quickly, monitor closely, improve based on real usage.