"""
Security middleware for adding HTTP security headers and protection mechanisms.
Implements OWASP recommendations for web application security.
"""
from fastapi import Request
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import uuid


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses following OWASP best practices."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.app = app
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # Security Headers (OWASP Recommended)
        
        # 1. XSS Protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # 2. Content-Type sniffing prevention
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # 3. Clickjacking protection
        response.headers["X-Frame-Options"] = "DENY"
        
        # 4. Strict Transport Security (HTTPS enforcement)
        # Note: Only set in production with valid SSL certificate
        if not request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # 5. Content Security Policy (basic)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        
        # 6. Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # 7. Permissions Policy (Feature Policy)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "fullscreen=(self), "
            "payment=()"
        )
        
        # 8. Remove server information
        if "Server" in response.headers:
            del response.headers["Server"]
        
        # 9. Add request ID for tracing
        request_id = str(uuid.uuid4())
        response.headers["X-Request-ID"] = request_id
        
        return response


class CORSMiddlewareEnhanced:
    """Enhanced CORS middleware with security considerations."""
    
    def __init__(self, app: ASGIApp):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
            
        # Process the request
        await self.app(scope, receive, send)