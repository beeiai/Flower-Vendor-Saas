from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseModel):
    """Application settings loaded from environment.

    All secrets (JWT, DB, third-party APIs) must be provided via env variables
    and never hard-coded in the codebase.
    """

    # Core security / auth
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))  # 2 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Security validation
    REQUIRE_SECURE_SECRETS: bool = os.getenv("REQUIRE_SECURE_SECRETS", "true").lower() == "true"
    
    # Master Admin Credentials (required for startup)
    MASTER_ADMIN_USERNAME: str = os.getenv("MASTER_ADMIN_USERNAME", "")
    MASTER_ADMIN_PASSWORD_HASH: str = os.getenv("MASTER_ADMIN_PASSWORD_HASH", "")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "3600"))

    # SMS / third-party APIs (optional; configure in production)
    SMS_API_URL: str | None = os.getenv("SMS_API_URL")
    SMS_API_KEY: str | None = os.getenv("SMS_API_KEY")
    SMS_SENDER_ID: str | None = os.getenv("SMS_SENDER_ID")
    SMS_MAX_RETRY: int = int(os.getenv("SMS_MAX_RETRY", "3"))

    # Rate limiting (per-process, per-instance)
    AUTH_RATE_LIMIT: int = int(os.getenv("AUTH_RATE_LIMIT", "100"))  # Per minute
    AUTH_RATE_WINDOW_SECONDS: int = int(os.getenv("AUTH_RATE_WINDOW_SECONDS", "60"))
    API_RATE_LIMIT: int = int(os.getenv("API_RATE_LIMIT", "300"))  # Per minute
    API_RATE_WINDOW_SECONDS: int = int(os.getenv("API_RATE_WINDOW_SECONDS", "60"))
    
    # Distributed rate limiting (Redis)
    REDIS_URL: str | None = os.getenv("REDIS_URL")
    ENABLE_DISTRIBUTED_RATE_LIMITING: bool = os.getenv("ENABLE_DISTRIBUTED_RATE_LIMITING", "false").lower() == "true"

    # CORS
    CORS_ALLOWED_ORIGINS: str = os.getenv(
        "CORS_ALLOWED_ORIGINS",
        ",".join(
            [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174",
            ]
        ),
    )


settings = Settings()
