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
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-prod")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://user:password@localhost:5432/dbname")

    # SMS / third-party APIs (optional; configure in production)
    SMS_API_URL: str | None = os.getenv("SMS_API_URL")
    SMS_API_KEY: str | None = os.getenv("SMS_API_KEY")
    SMS_SENDER_ID: str | None = os.getenv("SMS_SENDER_ID")
    SMS_MAX_RETRY: int = int(os.getenv("SMS_MAX_RETRY", "3"))

    # Rate limiting (per-process, per-instance)
    AUTH_RATE_LIMIT: int = int(os.getenv("AUTH_RATE_LIMIT", "10"))
    AUTH_RATE_WINDOW_SECONDS: int = int(os.getenv("AUTH_RATE_WINDOW_SECONDS", "60"))
    API_RATE_LIMIT: int = int(os.getenv("API_RATE_LIMIT", "120"))
    API_RATE_WINDOW_SECONDS: int = int(os.getenv("API_RATE_WINDOW_SECONDS", "60"))

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
