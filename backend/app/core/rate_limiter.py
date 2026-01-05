import logging
import time
from typing import Dict, Tuple, Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from jose import jwt, JWTError

from app.core.config import settings


logger = logging.getLogger(__name__)


class _FixedWindowRateLimiter:
    """Simple in-memory fixed-window rate limiter.

    This implementation is per-process and suitable for single-instance or
    low-scale deployments. In a multi-instance environment, replace this with a
    shared store (e.g. Redis) but keep the same interface.
    """

    def __init__(self) -> None:
        # key -> (window_start, count)
        self._buckets: Dict[str, Tuple[float, int]] = {}

    def is_allowed(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.monotonic()
        window_start, count = self._buckets.get(key, (now, 0))

        # Reset window if it has expired
        if now - window_start >= window_seconds:
            window_start, count = now, 0

        if count >= limit:
            # Store the existing window so we don't extend the block time
            self._buckets[key] = (window_start, count)
            return False

        self._buckets[key] = (window_start, count + 1)
        return True


_limiter = _FixedWindowRateLimiter()


def _get_client_ip(request: Request) -> str:
    """Best-effort client IP extraction.

    For production behind a reverse proxy, consider trusting X-Forwarded-For
    based on known proxy IPs instead of using client.host directly.
    """

    client_host = request.client.host if request.client else "unknown"
    return client_host or "unknown"


def _get_user_identifier(request: Request) -> Optional[str]:
    """Extract a stable user identifier from the Authorization token, if any.

    We only decode the JWT to read the `sub` claim (user email) and do not hit
    the database here. Any errors in decoding are silently ignored so that
    invalid tokens are handled by the normal auth layer, not the rate limiter.
    """

    auth_header = request.headers.get("Authorization") or ""
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None

    sub = payload.get("sub")
    if not sub:
        return None

    return f"user:{sub}"


async def rate_limit_middleware(request: Request, call_next):
    """Middleware enforcing IP + user-based rate limits.

    Scopes:
    * Auth endpoints (/auth/*): tighter limits (AUTH_RATE_LIMIT).
    * General API: broader limits (API_RATE_LIMIT).

    On violation, returns HTTP 429 with a standardized JSON body.
    """

    path = request.url.path or ""
    is_auth = path.startswith("/auth")

    if is_auth:
        limit = settings.AUTH_RATE_LIMIT
        window = settings.AUTH_RATE_WINDOW_SECONDS
        scope = "auth"
    else:
        limit = settings.API_RATE_LIMIT
        window = settings.API_RATE_WINDOW_SECONDS
        scope = "api"

    ip = _get_client_ip(request)
    user_id = _get_user_identifier(request)

    # IP-based limiting
    ip_key = f"{scope}:ip:{ip}"
    if not _limiter.is_allowed(ip_key, limit, window):
        logger.warning(
            "Rate limit exceeded (scope=%s, ip=%s, user=%s, path=%s)",
            scope,
            ip,
            user_id or "anonymous",
            path,
        )
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please try again later."},
        )

    # Authenticated user-based limiting (applies only when we have a valid JWT)
    if user_id is not None:
        user_key = f"{scope}:{user_id}"
        if not _limiter.is_allowed(user_key, limit, window):
            logger.warning(
                "User rate limit exceeded (scope=%s, user=%s, ip=%s, path=%s)",
                scope,
                user_id,
                ip,
                path,
            )
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
            )

    # Within rate limits; proceed to the next middleware/handler
    response = await call_next(request)
    return response
