"""
Request ID middleware for distributed tracing.
Generates and manages unique request IDs for log correlation.
"""
import uuid
import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from app.core.structured_logging import set_request_id, get_request_id


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that generates a unique request ID for each incoming request.
    The request ID is added to:
    1. Request context for logging
    2. Response headers for client correlation
    """
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())
        
        # Store in context for logging
        set_request_id(request_id)
        
        # Add to request state for access in route handlers
        request.state.request_id = request_id
        
        # Record start time for performance logging
        start_time = time.perf_counter()
        
        try:
            # Process the request
            response = await call_next(request)
        except Exception:
            # Still set the header even if there's an error
            response = Response("Internal server error", status_code=500)
        
        # Calculate processing time
        process_time = time.perf_counter() - start_time
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        # Add timing header (optional)
        response.headers["X-Process-Time"] = str(round(process_time * 1000, 2))
        
        # Log the request at INFO level
        self._log_request(request, response, process_time)
        
        return response
    
    def _log_request(self, request: Request, response: Response, process_time: float):
        """Log request information at INFO level."""
        import logging
        logger = logging.getLogger("request")
        
        logger.info(
            f"{request.method} {request.url.path}",
            extra={
                "http_method": request.method,
                "http_path": request.url.path,
                "http_status": response.status_code,
                "process_time_ms": round(process_time * 1000, 2),
                "client_ip": self._get_client_ip(request),
                "user_agent": request.headers.get("user-agent", "unknown")
            }
        )
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address, considering forwarded headers."""
        # Check for forwarded headers (reverse proxy/load balancer)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to client host
        if request.client:
            return request.client.host
        
        return "unknown"