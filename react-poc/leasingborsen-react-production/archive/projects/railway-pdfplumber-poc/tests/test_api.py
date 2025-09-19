"""Tests for FastAPI endpoints"""
import pytest
from fastapi.testclient import TestClient
import base64
from PIL import Image
import io

from app import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def sample_image_base64():
    """Create a sample test image"""
    # Create simple test image
    img = Image.new('RGBA', (800, 600), (255, 255, 255, 255))
    
    # Add some content
    pixels = img.load()
    for x in range(200, 600):
        for y in range(150, 450):
            pixels[x, y] = (100, 100, 100, 255)
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_root_health(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "features" in data
        assert "image_resize" in data["features"]
    
    def test_health_endpoint(self, client):
        """Test /health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
    
    def test_cache_stats(self, client):
        """Test cache stats endpoint"""
        response = client.get("/cache/stats")
        assert response.status_code == 200
        
        stats = response.json()
        assert "total_entries" in stats
        assert "max_size" in stats


class TestImageProcessing:
    """Test image processing endpoint"""
    
    def test_process_image_basic(self, client, sample_image_base64):
        """Test basic image processing"""
        response = client.post("/process-image", json={
            "image_base64": sample_image_base64,
            "filename": "test.jpg"
        })
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["processed"] is not None
        assert "metadata" in data
    
    def test_process_image_with_options(self, client, sample_image_base64):
        """Test image processing with custom options"""
        response = client.post("/process-image", json={
            "image_base64": sample_image_base64,
            "filename": "test.jpg",
            "options": {
                "remove_background": False,  # Skip API4.ai for tests
                "auto_crop": True,
                "add_shadow": True,
                "create_sizes": True
            }
        })
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["sizes"] is not None
        assert "grid" in data["sizes"]
        assert "detail" in data["sizes"]
        assert "full" in data["sizes"]
    
    def test_invalid_base64(self, client):
        """Test error handling for invalid input"""
        response = client.post("/process-image", json={
            "image_base64": "invalid-base64",
            "filename": "test.jpg"
        })
        
        assert response.status_code == 400
    
    def test_caching_works(self, client, sample_image_base64):
        """Test that caching reduces processing time"""
        # First request
        response1 = client.post("/process-image", json={
            "image_base64": sample_image_base64,
            "filename": "test.jpg",
            "options": {
                "remove_background": False,
                "auto_crop": True,
                "add_shadow": True
            }
        })
        
        assert response1.status_code == 200
        data1 = response1.json()
        time1 = data1["metadata"]["processing_time_ms"]
        
        # Second identical request (should hit cache)
        response2 = client.post("/process-image", json={
            "image_base64": sample_image_base64,
            "filename": "test.jpg",
            "options": {
                "remove_background": False,
                "auto_crop": True,
                "add_shadow": True
            }
        })
        
        assert response2.status_code == 200
        data2 = response2.json()
        time2 = data2["metadata"]["processing_time_ms"]
        
        # Cache hit should be much faster
        assert time2 < time1 / 10  # At least 10x faster
        
        # Results should be identical
        assert data1["processed"] == data2["processed"]


class TestPDFExtraction:
    """Test existing PDF extraction still works"""
    
    def test_pdf_extraction_endpoint(self, client):
        """Test that PDF extraction endpoint still exists"""
        # Create minimal PDF-like file
        pdf_content = b"%PDF-1.4\n%fake pdf content"
        
        response = client.post(
            "/extract/structured",
            files={"file": ("test.pdf", pdf_content, "application/pdf")}
        )
        
        # Should fail gracefully with our fake PDF
        assert response.status_code == 500
        assert "error" in response.json()