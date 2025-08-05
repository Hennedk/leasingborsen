# Python Image Processing Service - Implementation Plan

## Overview
Replace the current complex image processing pipeline (Edge Function → API4.ai → Edge Function with imagescript issues) with a single Python service that handles all image processing operations.

## Architecture

### Current Flow (Complex)
```
Admin UI → Edge Function → API4.ai → Edge Function (imagescript fails) → Storage
```

### New Flow (Simplified)
```
Admin UI → Edge Function (proxy) → Python Service → Storage
                                   ↓
                              [API4.ai, Auto-crop, Shadow, Resize]
```

## Test-Driven Development Approach

### Phase 1: Core Functionality Tests (Write First)

```python
# tests/test_image_processing.py
import pytest
from PIL import Image
import io
import base64

class TestImageProcessing:
    """Core image processing tests to write before implementation"""
    
    @pytest.fixture
    def sample_car_image(self):
        """Create a test image with car-like dimensions"""
        img = Image.new('RGBA', (2560, 1440), (255, 255, 255, 255))
        # Add some non-white pixels to simulate a car
        for x in range(800, 1760):
            for y in range(400, 1040):
                img.putpixel((x, y), (50, 50, 50, 255))
        return img
    
    @pytest.fixture
    def transparent_bg_image(self):
        """Image with transparent background (simulating API4.ai output)"""
        img = Image.new('RGBA', (2560, 1440), (0, 0, 0, 0))
        # Car pixels in center
        for x in range(800, 1760):
            for y in range(400, 1040):
                img.putpixel((x, y), (50, 50, 50, 255))
        return img
    
    def test_auto_crop_removes_transparent_padding(self, transparent_bg_image):
        """Test that auto-crop correctly identifies and removes transparent areas"""
        cropped = auto_crop_with_padding(transparent_bg_image)
        
        # Should crop to approximately 960x640 plus padding
        assert cropped.width < 1200  # Much smaller than original 2560
        assert cropped.height < 900  # Much smaller than original 1440
        assert cropped.width > 960   # But includes padding
        assert cropped.height > 640  # But includes padding
    
    def test_auto_crop_preserves_content(self, transparent_bg_image):
        """Test that no actual car pixels are lost during crop"""
        cropped = auto_crop_with_padding(transparent_bg_image)
        
        # Check that the car pixels are still present
        # Convert to numpy for easier analysis
        import numpy as np
        cropped_array = np.array(cropped)
        
        # Count non-transparent pixels
        non_transparent = np.sum(cropped_array[:, :, 3] > 0)
        expected_pixels = 960 * 640  # Original car size
        
        assert non_transparent >= expected_pixels
    
    def test_drop_shadow_increases_canvas_size(self, transparent_bg_image):
        """Test that drop shadow properly expands canvas"""
        with_shadow = add_drop_shadow(transparent_bg_image)
        
        assert with_shadow.width > transparent_bg_image.width
        assert with_shadow.height > transparent_bg_image.height
    
    def test_drop_shadow_preserves_original(self, transparent_bg_image):
        """Test that original image is preserved on top of shadow"""
        with_shadow = add_drop_shadow(transparent_bg_image)
        
        # Center of image should still have original pixels
        center_x = with_shadow.width // 2
        center_y = with_shadow.height // 2
        
        pixel = with_shadow.getpixel((center_x, center_y))
        assert pixel[3] == 255  # Fully opaque (original car)
    
    @pytest.mark.asyncio
    async def test_api4ai_integration(self, sample_car_image):
        """Test actual API4.ai integration"""
        # Convert to base64
        buffer = io.BytesIO()
        sample_car_image.save(buffer, format='PNG')
        base64_image = base64.b64encode(buffer.getvalue()).decode()
        
        result = await remove_background_api4ai(base64_image)
        
        assert result is not None
        assert 'error' not in result
        # Decode and check it's valid PNG
        decoded = base64.b64decode(result)
        img = Image.open(io.BytesIO(decoded))
        assert img.mode == 'RGBA'
    
    @pytest.mark.asyncio
    async def test_complete_pipeline(self, sample_car_image):
        """Test the entire processing pipeline end-to-end"""
        buffer = io.BytesIO()
        sample_car_image.save(buffer, format='PNG')
        base64_image = base64.b64encode(buffer.getvalue()).decode()
        
        result = await process_image_complete(base64_image, "test.jpg")
        
        assert result['success'] is True
        assert 'processed' in result
        assert 'grid' in result
        assert 'detail' in result
        assert 'metadata' in result
        
        # Check metadata
        assert result['metadata']['original_size'] == [2560, 1440]
        assert result['metadata']['final_size'][0] < 2560  # Cropped
        assert result['metadata']['has_shadow'] is True
```

### Phase 2: API Tests

```python
# tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from app import app

class TestAPI:
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_health_check(self, client):
        """Test health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_process_image_endpoint(self, client, sample_base64_image):
        """Test main processing endpoint"""
        response = client.post("/process-image", json={
            "image_base64": sample_base64_image,
            "filename": "test.jpg",
            "options": {
                "remove_background": True,
                "auto_crop": True,
                "add_shadow": True
            }
        })
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        
    def test_invalid_base64(self, client):
        """Test error handling for invalid input"""
        response = client.post("/process-image", json={
            "image_base64": "invalid-base64",
            "filename": "test.jpg"
        })
        
        assert response.status_code == 400
        assert "error" in response.json()
    
    def test_caching_works(self, client, sample_base64_image):
        """Test that identical images use cache"""
        # First request
        response1 = client.post("/process-image", json={
            "image_base64": sample_base64_image,
            "filename": "test.jpg"
        })
        
        # Second identical request
        response2 = client.post("/process-image", json={
            "image_base64": sample_base64_image,
            "filename": "test.jpg"
        })
        
        assert response1.json() == response2.json()
        # Check headers or metadata to verify cache hit
```

### Phase 3: Performance Tests

```python
# tests/test_performance.py
import pytest
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor

class TestPerformance:
    @pytest.mark.asyncio
    async def test_processing_time(self, sample_base64_image):
        """Test that processing completes within acceptable time"""
        start = time.time()
        result = await process_image_complete(sample_base64_image, "test.jpg")
        duration = time.time() - start
        
        assert duration < 5.0  # Should complete within 5 seconds
        assert result['metadata']['processing_time'] < 5000  # ms
    
    @pytest.mark.asyncio
    async def test_concurrent_processing(self, sample_base64_image):
        """Test handling multiple concurrent requests"""
        async def process_one():
            return await process_image_complete(sample_base64_image, "test.jpg")
        
        # Process 10 images concurrently
        tasks = [process_one() for _ in range(10)]
        results = await asyncio.gather(*tasks)
        
        # All should succeed
        assert all(r['success'] for r in results)
        
    def test_memory_usage(self, large_image):
        """Test that memory usage stays reasonable"""
        import psutil
        process = psutil.Process()
        
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Process large image
        result = process_image_complete(large_image, "large.jpg")
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        assert memory_increase < 500  # Should not use more than 500MB
```

## Implementation Plan

### 1. Project Structure
```
python-image-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── models.py            # Pydantic models
│   ├── processors/
│   │   ├── __init__.py
│   │   ├── background.py    # API4.ai integration
│   │   ├── crop.py          # Auto-crop logic
│   │   ├── shadow.py        # Drop shadow
│   │   └── resize.py        # Size generation
│   ├── storage/
│   │   ├── __init__.py
│   │   └── supabase.py      # Supabase uploads
│   └── utils/
│       ├── __init__.py
│       ├── cache.py         # Redis caching
│       └── monitoring.py    # Metrics/logging
├── tests/
│   ├── conftest.py          # Shared fixtures
│   ├── test_processors/
│   ├── test_api/
│   └── test_integration/
├── Dockerfile
├── docker-compose.yml       # Local dev with Redis
├── requirements.txt
├── pyproject.toml
└── railway.toml            # Railway deployment
```

### 2. Core Implementation (Following TDD)

```python
# app/main.py
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
import redis.asyncio as redis

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.redis = await redis.from_url(REDIS_URL)
    app.state.image_processor = ImageProcessor()
    yield
    # Shutdown
    await app.state.redis.close()

app = FastAPI(lifespan=lifespan)

@app.post("/process-image")
async def process_image(request: ProcessImageRequest):
    """Main endpoint for complete image processing"""
    try:
        processor = app.state.image_processor
        result = await processor.process_complete(
            request.image_base64,
            request.filename,
            request.options
        )
        return result
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# app/processors/crop.py
import numpy as np
from PIL import Image

def auto_crop_with_padding(
    image: Image.Image,
    padding_percent: float = 0.05,
    min_padding: int = 20,
    max_crop_ratio: float = 0.8
) -> Image.Image:
    """
    Auto-crop implementation that actually works with Pillow
    """
    # Convert to numpy array
    data = np.array(image)
    
    # Handle both RGB and RGBA
    if len(data.shape) == 3 and data.shape[2] == 4:
        alpha = data[:, :, 3]
    else:
        # For RGB, create fake alpha (all opaque)
        alpha = np.ones((data.shape[0], data.shape[1])) * 255
    
    # Find content bounds
    rows = np.any(alpha > 10, axis=1)
    cols = np.any(alpha > 10, axis=0)
    
    if not np.any(rows) or not np.any(cols):
        return image  # Empty image
    
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    
    # Calculate padding
    content_width = cmax - cmin
    content_height = rmax - rmin
    
    pad_x = max(min_padding, int(content_width * padding_percent))
    pad_y = max(min_padding, int(content_height * padding_percent))
    
    # Apply bounds
    left = max(0, cmin - pad_x)
    top = max(0, rmin - pad_y)
    right = min(image.width, cmax + pad_x + 1)
    bottom = min(image.height, rmax + pad_y + 1)
    
    # Ensure minimum size
    if (right - left) / image.width < (1 - max_crop_ratio):
        center_x = (left + right) // 2
        half_width = int(image.width * (1 - max_crop_ratio) / 2)
        left = max(0, center_x - half_width)
        right = min(image.width, center_x + half_width)
    
    return image.crop((left, top, right, bottom))
```

### 3. Deployment Configuration

```yaml
# railway.toml
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[environment]
PYTHON_VERSION = "3.11"
```

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libtiff-dev \
    libwebp-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run tests during build (fail fast)
RUN python -m pytest tests/unit -v

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 4. Integration Strategy

#### Phase 1: Parallel Deployment (Safe)
- Deploy Python service
- Update Edge Function to optionally use Python service
- A/B test with small percentage of traffic
- Monitor metrics

#### Phase 2: Full Migration
- Route all traffic to Python service
- Edge Function becomes simple proxy
- Remove imagescript dependencies

#### Phase 3: Direct Integration
- Admin UI calls Python service directly
- Remove Edge Function entirely
- Full control over image pipeline

### 5. Monitoring & Observability

```python
# app/utils/monitoring.py
from prometheus_client import Counter, Histogram, Gauge
import structlog

# Metrics
image_processed = Counter('images_processed_total', 'Total processed images')
processing_time = Histogram('image_processing_duration_seconds', 'Processing time')
cache_hits = Counter('cache_hits_total', 'Cache hit count')
api4ai_calls = Counter('api4ai_calls_total', 'API4.ai API calls')
active_processing = Gauge('active_processing_count', 'Currently processing')

# Structured logging
logger = structlog.get_logger()

@processing_time.time()
async def process_with_metrics(image_data: str):
    with active_processing.track_inprogress():
        logger.info("processing_started", image_size=len(image_data))
        result = await process_image(image_data)
        logger.info("processing_completed", success=True)
        image_processed.inc()
        return result
```

### 6. Error Handling & Resilience

```python
from tenacity import retry, stop_after_attempt, wait_exponential

class ImageProcessor:
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def call_api4ai(self, image_data: str):
        """Retry API4.ai calls with exponential backoff"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'https://api4.ai/api/v1/background',
                    headers={'X-API-Key': self.api_key},
                    data={'image': image_data},
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 429:  # Rate limited
                        wait_time = int(response.headers.get('Retry-After', 60))
                        await asyncio.sleep(wait_time)
                        raise Exception("Rate limited, retrying...")
                    
                    return await response.json()
        except asyncio.TimeoutError:
            logger.error("api4ai_timeout")
            raise
```

### 7. Security Considerations

```python
# app/security.py
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

async def verify_api_key(api_key: str = Security(api_key_header)):
    """Verify internal API key for Edge Function calls"""
    if api_key != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )
    return api_key

# Use in routes
@app.post("/process-image", dependencies=[Depends(verify_api_key)])
async def process_image(request: ProcessImageRequest):
    ...
```

## Testing Strategy

1. **Unit Tests**: Each processor function tested in isolation
2. **Integration Tests**: Full pipeline with mocked API4.ai
3. **Contract Tests**: Verify API4.ai response format
4. **Performance Tests**: Load testing with Locust
5. **Smoke Tests**: Basic health checks in production

## Rollback Strategy

1. Feature flags in Edge Function
2. Keep existing code path available
3. Monitor error rates
4. One-click rollback via environment variable

## Success Metrics

- Processing time < 3s (p95)
- Error rate < 1%
- Cache hit rate > 30%
- Memory usage < 512MB
- API4.ai costs reduced by 20% (via caching)

## Timeline

- Week 1: Setup project, write all tests
- Week 2: Implement processors (TDD)
- Week 3: API endpoints and integration
- Week 4: Deploy to Railway, A/B testing
- Week 5: Full migration, monitoring

This plan ensures a robust, tested implementation that solves the current issues while providing a foundation for future enhancements.