"""
Lightweight caching utilities for performance optimization.
Provides per-request caching and short-lived in-memory caching without external dependencies.
"""
import time
import threading
import os
from typing import Any, Callable, Dict, Optional, TypeVar, cast
from functools import wraps
from hashlib import md5

T = TypeVar('T')

# Thread-local storage for per-request cache
_local = threading.local()

# Check if caching is enabled (disabled in test environments)
CACHE_ENABLED = os.getenv('CACHE_ENABLED', 'True').lower() == 'true'


def get_per_request_cache() -> Dict[str, Any]:
    """
    Get the per-request cache. This cache lives for the duration of a single request.
    Useful for caching repeated calls to expensive pure functions within a single request.
    """
    if not hasattr(_local, 'cache'):
        _local.cache = {}
    return _local.cache


def clear_per_request_cache() -> None:
    """
    Clear the per-request cache. Called automatically at the end of each request.
    """
    if hasattr(_local, 'cache'):
        _local.cache.clear()


def cached_per_request(ttl: int = 0):
    """
    Decorator to cache function results per request.
    The ttl parameter is ignored for per-request cache since it's cleared after each request.
    
    Args:
        ttl: Time-to-live in seconds (ignored for per-request cache)
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Skip caching if disabled
            if not CACHE_ENABLED:
                return func(*args, **kwargs)
            # Create cache key from function name and arguments
            cache_key = f"{func.__name__}:{str(args)}:{str(sorted(kwargs.items()))}"
            
            cache = get_per_request_cache()
            
            if cache_key in cache:
                return cache[cache_key]
            
            result = func(*args, **kwargs)
            cache[cache_key] = result
            
            return result
        return wrapper
    return decorator


class SimpleInMemoryCache:
    """
    Simple in-memory cache with TTL support.
    Thread-safe and suitable for single-instance deployments.
    Not persistent across application restarts.
    """
    
    def __init__(self):
        self._cache: Dict[str, tuple] = {}  # key -> (value, expiration_time)
        self._lock = threading.Lock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get a value from the cache, returning None if expired or not found."""
        with self._lock:
            if key in self._cache:
                value, expires_at = self._cache[key]
                if time.time() < expires_at:
                    return value
                else:
                    # Clean up expired entry
                    del self._cache[key]
            return None
    
    def set(self, key: str, value: Any, ttl: int = 300) -> None:  # Default 5 minutes
        """Set a value in the cache with a TTL in seconds."""
        with self._lock:
            expires_at = time.time() + ttl
            self._cache[key] = (value, expires_at)
    
    def delete(self, key: str) -> bool:
        """Delete a key from the cache."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self) -> None:
        """Clear all entries from the cache."""
        with self._lock:
            self._cache.clear()
    
    def cleanup_expired(self) -> int:
        """Remove all expired entries and return count of removed entries."""
        with self._lock:
            current_time = time.time()
            expired_keys = [
                key for key, (_, expires_at) in self._cache.items()
                if current_time >= expires_at
            ]
            
            for key in expired_keys:
                del self._cache[key]
            
            return len(expired_keys)


# Global instance of the in-memory cache
cache = SimpleInMemoryCache()


def cached(ttl: int = 300):
    """
    Decorator to cache function results in memory with TTL.
    
    Args:
        ttl: Time-to-live in seconds (default 300 seconds = 5 minutes)
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Skip caching if disabled
            if not CACHE_ENABLED:
                return func(*args, **kwargs)
            # Create cache key from function name and arguments
            key_input = f"{func.__name__}:{str(args)}:{str(sorted(kwargs.items()))}"
            # Use MD5 hash to keep key length manageable
            cache_key = md5(key_input.encode()).hexdigest()
            
            # Try to get from cache first
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


def cached_property(ttl: int = 300):
    """
    Decorator to cache property results in memory with TTL.
    Similar to functools.cached_property but with TTL support.
    """
    def decorator(func: Callable[..., T]):
        attr_name = f'_cached_{func.__name__}'
        ttl_attr = f'_cached_{func.__name__}_expires_at'
        
        @property
        def wrapper(instance):
            current_time = time.time()
            
            # Check if cached value exists and hasn't expired
            if hasattr(instance, attr_name) and hasattr(instance, ttl_attr):
                expires_at = getattr(instance, ttl_attr)
                if current_time < expires_at:
                    return getattr(instance, attr_name)
            
            # Compute and cache the value
            value = func(instance)
            setattr(instance, attr_name, value)
            setattr(instance, ttl_attr, current_time + ttl)
            
            return value
        
        return wrapper
    return decorator


# Context manager for batch cache operations
class CacheBatch:
    """
    Context manager for batch cache operations.
    Allows multiple cache operations to be performed with a single lock acquisition.
    """
    
    def __enter__(self):
        cache._lock.acquire()
        return cache._cache
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        cache._lock.release()


# Utility function to safely get cached data with fallback
def get_cached_or_call(cache_key: str, callback: Callable[[], T], ttl: int = 300) -> T:
    """
    Get a value from cache or compute it using the callback if not present.
    
    Args:
        cache_key: Key to use for caching
        callback: Function to call if value is not in cache
        ttl: Time-to-live in seconds
    
    Returns:
        Cached or computed value
    """
    cached_value = cache.get(cache_key)
    if cached_value is not None:
        return cached_value
    
    result = callback()
    cache.set(cache_key, result, ttl)
    return result