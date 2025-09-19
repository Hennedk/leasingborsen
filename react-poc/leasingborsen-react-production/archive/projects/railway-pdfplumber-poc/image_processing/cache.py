"""Simple in-memory cache for processed images"""
import hashlib
import time
from typing import Dict, Optional, Any
from collections import OrderedDict
import threading


class ImageCache:
    """
    Simple LRU cache for processed images.
    Stores results in memory with size and time limits.
    """
    
    def __init__(self, max_size: int = 100, ttl_seconds: int = 3600):
        """
        Initialize cache.
        
        Args:
            max_size: Maximum number of entries to store
            ttl_seconds: Time to live for cache entries in seconds
        """
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self.lock = threading.Lock()
    
    def _generate_key(self, image_base64: str, options: Dict[str, Any]) -> str:
        """Generate cache key from image and options."""
        # Create a stable string representation of options
        options_str = str(sorted(options.items()))
        
        # Hash the image content and options
        hasher = hashlib.sha256()
        hasher.update(image_base64.encode('utf-8'))
        hasher.update(options_str.encode('utf-8'))
        
        return hasher.hexdigest()
    
    def get(self, image_base64: str, options: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Get cached result if available and not expired.
        
        Args:
            image_base64: Base64 encoded image
            options: Processing options
        
        Returns:
            Cached result or None
        """
        key = self._generate_key(image_base64, options)
        
        with self.lock:
            if key in self.cache:
                entry = self.cache[key]
                
                # Check if expired
                if time.time() - entry['timestamp'] > self.ttl_seconds:
                    del self.cache[key]
                    return None
                
                # Move to end (most recently used)
                self.cache.move_to_end(key)
                
                # Return copy to avoid mutations
                return entry['data'].copy()
        
        return None
    
    def set(self, image_base64: str, options: Dict[str, Any], result: Dict[str, Any]):
        """
        Store result in cache.
        
        Args:
            image_base64: Base64 encoded image
            options: Processing options
            result: Processing result to cache
        """
        key = self._generate_key(image_base64, options)
        
        with self.lock:
            # Remove oldest entries if at capacity
            while len(self.cache) >= self.max_size:
                self.cache.popitem(last=False)
            
            # Store new entry
            self.cache[key] = {
                'timestamp': time.time(),
                'data': result.copy()
            }
    
    def clear(self):
        """Clear all cache entries."""
        with self.lock:
            self.cache.clear()
    
    def stats(self) -> Dict[str, int]:
        """Get cache statistics."""
        with self.lock:
            total_entries = len(self.cache)
            
            # Count expired entries
            current_time = time.time()
            expired = sum(
                1 for entry in self.cache.values()
                if current_time - entry['timestamp'] > self.ttl_seconds
            )
            
            return {
                'total_entries': total_entries,
                'active_entries': total_entries - expired,
                'expired_entries': expired,
                'max_size': self.max_size,
                'ttl_seconds': self.ttl_seconds
            }


# Global cache instance
image_cache = ImageCache(max_size=100, ttl_seconds=3600)