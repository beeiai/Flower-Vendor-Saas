"""
Redis client for distributed caching and rate limiting.
Used in production deployments for shared state across instances.
Gracefully falls back to in-memory storage when Redis is unavailable.
"""
import redis
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class RedisClient:
    """Singleton Redis client with graceful fallback to in-memory storage."""
    
    def __init__(self):
        self.client = None
        self._connection_attempted = False
        self._connection_successful = False
    
    async def connect(self):
        """Initialize Redis connection with graceful fallback.
        
        Returns:
            bool: True if Redis connection successful, False otherwise
        """
        if self._connection_attempted:
            return self._connection_successful
        
        self._connection_attempted = True
        
        # Only attempt connection if Redis URL is configured
        if not settings.REDIS_URL:
            logger.info("REDIS_URL not configured, using in-memory rate limiting")
            self._connection_successful = False
            return False
        
        if not settings.ENABLE_DISTRIBUTED_RATE_LIMITING:
            logger.info("Distributed rate limiting disabled, using in-memory storage")
            self._connection_successful = False
            return False
        
        try:
            logger.info(f"Attempting Redis connection to {settings.REDIS_URL}")
            self.client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            # Test connection
            await self.client.ping()
            self._connection_successful = True
            logger.info("Redis connection established successfully")
            return True
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Falling back to in-memory rate limiting.")
            self.client = None
            self._connection_successful = False
            return False
    
    async def close(self):
        """Close Redis connection gracefully."""
        if self.client:
            try:
                await self.client.close()
                logger.info("Redis connection closed")
            except Exception as e:
                logger.warning(f"Error closing Redis connection: {e}")
            finally:
                self.client = None
                self._connection_successful = False
                self._connection_attempted = False
    
    @property
    def is_connected(self) -> bool:
        """Check if Redis client is connected and ready.
        
        Returns:
            bool: True if connected, False otherwise
        """
        return self._connection_successful and self.client is not None
    
    async def increment_with_ttl(self, key: str, ttl_seconds: int) -> int:
        """Increment counter with automatic TTL expiration.
        
        Args:
            key: Redis key to increment
            ttl_seconds: Time-to-live in seconds
            
        Returns:
            int: Current value after increment, or 0 if Redis unavailable
        """
        if not self.is_connected:
            return 0
        
        try:
            pipe = self.client.pipeline()
            pipe.incr(key)
            pipe.expire(key, ttl_seconds)
            results = await pipe.execute()
            return results[0]
        except Exception as e:
            logger.warning(f"Redis operation failed: {e}. Falling back to in-memory.")
            # Mark as disconnected to trigger fallback
            self._connection_successful = False
            return 0
    
    async def get(self, key: str) -> str | None:
        """Get value by key.
        
        Args:
            key: Redis key to retrieve
            
        Returns:
            str | None: Value if found, None otherwise
        """
        if not self.is_connected:
            return None
        
        try:
            return await self.client.get(key)
        except Exception as e:
            logger.warning(f"Redis GET failed: {e}")
            self._connection_successful = False
            return None
    
    async def setex(self, key: str, ttl_seconds: int, value: str) -> bool:
        """Set key with expiration.
        
        Args:
            key: Redis key to set
            ttl_seconds: Time-to-live in seconds
            value: Value to store
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.is_connected:
            return False
        
        try:
            return await self.client.setex(key, ttl_seconds, value)
        except Exception as e:
            logger.warning(f"Redis SETEX failed: {e}")
            self._connection_successful = False
            return False


# Global instance - created at module import time but connection happens lazily
redis_client = RedisClient()