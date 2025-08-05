"""Pydantic models for image processing API"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from enum import Enum


class ProcessingMode(str, Enum):
    """Image processing modes"""
    AUTO = "auto"
    CAR = "car"
    PRODUCT = "product"
    PERSON = "person"


class ShadowType(str, Enum):
    """Shadow types available"""
    DROP = "drop"           # Traditional drop shadow
    GROUND = "ground"       # Single elliptical ground shadow
    DUAL_GROUND = "dual_ground"  # Two shadows under wheels


class ImageOptions(BaseModel):
    """Options for image processing"""
    remove_background: bool = True
    auto_crop: bool = True
    add_shadow: bool = True
    create_sizes: bool = True
    # Shadow type selection
    shadow_type: ShadowType = ShadowType.GROUND  # Default to ground shadow
    # Drop shadow parameters
    shadow_offset: tuple = (10, 10)
    shadow_blur: int = 20
    # Ground shadow parameters
    shadow_height_ratio: float = 0.15
    shadow_width_ratio: float = 0.9
    shadow_opacity_center: float = 0.7
    shadow_opacity_edge: float = 0.0
    # Dual ground shadow parameters
    wheel_spacing_ratio: float = 0.6
    shadow_size_ratio: float = 0.25
    # Common parameters
    padding_percent: float = 0.05
    quality: int = 85
    format: str = "WEBP"


class ProcessImageRequest(BaseModel):
    """Request model for image processing"""
    image_base64: str = Field(..., description="Base64 encoded image")
    filename: str = Field(..., description="Original filename")
    options: Optional[ImageOptions] = Field(default_factory=ImageOptions)
    mode: ProcessingMode = ProcessingMode.CAR


class ImageMetadata(BaseModel):
    """Metadata about processed image"""
    original_size: List[int]
    final_size: List[int]
    has_background_removed: bool
    has_shadow: bool
    shadow_type: Optional[str] = None
    was_cropped: bool
    processing_time_ms: int
    format: str


class ProcessImageResponse(BaseModel):
    """Response model for image processing"""
    success: bool
    processed: Optional[str] = Field(None, description="Base64 encoded processed image")
    sizes: Optional[Dict[str, str]] = Field(None, description="Different sized versions")
    metadata: Optional[ImageMetadata] = None
    error: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "processed": "base64_string...",
                "sizes": {
                    "grid": "base64_string...",
                    "detail": "base64_string...",
                    "full": "base64_string..."
                },
                "metadata": {
                    "original_size": [2560, 1920],
                    "final_size": [1200, 900],
                    "has_background_removed": True,
                    "has_shadow": True,
                    "was_cropped": True,
                    "processing_time_ms": 2150,
                    "format": "WEBP"
                }
            }
        }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str
    features: List[str]