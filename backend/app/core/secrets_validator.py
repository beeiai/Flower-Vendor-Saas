"""
Security module for validating secrets and configuration at startup.
Ensures production deployments have secure configuration.
"""
import re
import secrets as secret_module
from app.core.config import settings


def validate_secrets():
    """Validate all required secrets and configuration.
    
    Raises:
        ValueError: If required secrets are missing or insecure.
    """
    errors = []
    
    # Validate SECRET_KEY
    if not settings.SECRET_KEY:
        errors.append("SECRET_KEY is required")
    elif settings.REQUIRE_SECURE_SECRETS and len(settings.SECRET_KEY) < 32:
        errors.append("SECRET_KEY must be at least 32 characters long in production")
    elif settings.REQUIRE_SECURE_SECRETS and settings.SECRET_KEY == "change-me-in-prod":
        errors.append("SECRET_KEY must be changed from default value")
    
    # Validate DATABASE_URL
    if not settings.DATABASE_URL:
        errors.append("DATABASE_URL is required")
    elif settings.REQUIRE_SECURE_SECRETS and "localhost" in settings.DATABASE_URL.lower():
        # In production, database should not be on localhost
        pass  # Allow for development
    
    # Validate critical third-party API keys if configured
    if settings.SMS_API_KEY and len(settings.SMS_API_KEY) < 16:
        errors.append("SMS_API_KEY should be at least 16 characters long")
    
    # Validate rate limiting configuration
    if settings.AUTH_RATE_LIMIT <= 0:
        errors.append("AUTH_RATE_LIMIT must be positive")
    if settings.API_RATE_LIMIT <= 0:
        errors.append("API_RATE_LIMIT must be positive")
    
    # Validate access token expiration
    if settings.ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
        errors.append("ACCESS_TOKEN_EXPIRE_MINUTES must be positive")
    elif settings.ACCESS_TOKEN_EXPIRE_MINUTES > 60 and settings.REQUIRE_SECURE_SECRETS:
        errors.append("ACCESS_TOKEN_EXPIRE_MINUTES should be <= 60 minutes in production")
    
    if errors:
        raise ValueError("Configuration validation failed:\n" + "\n".join(f"  - {err}" for err in errors))


def generate_secure_secret(length: int = 64) -> str:
    """Generate a cryptographically secure secret key.
    
    Args:
        length: Length of the secret in bytes (before base64 encoding)
        
    Returns:
        Base64-encoded secure random string
    """
    return secret_module.token_urlsafe(length)


def is_production_environment() -> bool:
    """Detect if running in production environment."""
    import os
    env = os.getenv("ENVIRONMENT", "development").lower()
    return env in ("production", "prod", "release")


def sanitize_log_value(value: str, max_length: int = 10) -> str:
    """Sanitize sensitive values for logging.
    
    Args:
        value: The value to sanitize
        max_length: Maximum length to show
        
    Returns:
        Sanitized string showing only first few characters
    """
    if not value:
        return ""
    if len(value) <= max_length:
        return "*" * len(value)
    return value[:max_length] + "..."


# Run validation at import time
try:
    validate_secrets()
except ValueError as e:
    import sys
    print(f"❌ Security configuration error: {e}", file=sys.stderr)
    if settings.REQUIRE_SECURE_SECRETS:
        sys.exit(1)
    else:
        print("⚠️  Continuing with insecure configuration (REQUIRE_SECURE_SECRETS=false)", file=sys.stderr)