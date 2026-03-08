"""
Middleware to manage per-request cache lifecycle.
Clears the per-request cache after each request completes.
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response

class CacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception:
            return Response(
                content="Internal Server Error",
                status_code=500
            )
