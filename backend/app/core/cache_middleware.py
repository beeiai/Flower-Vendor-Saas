"""
Middleware to manage per-request cache lifecycle.
Clears the per-request cache after each request completes.
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from app.utils.cache import clear_per_request_cache


class PerRequestCacheMiddleware(BaseHTTPMiddleware):
    """
    Middleware to clear per-request cache after each request.
    Ensures cache doesn't leak between requests.
    """
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        try:
            # Process the request
            response = await call_next(request)
        finally:
            # Clear per-request cache after request completes (success or failure)
            clear_per_request_cache()
        
        return response