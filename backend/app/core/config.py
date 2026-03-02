from pydantic import BaseModel, field_validator
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseModel):
    """
    Central application configuration.

    Loads values from environment variables and:
    - Validates required fields
    - Fixes Render postgres:// issue
    - Provides production-safe defaults
    """

    # =========================
    # 🔐 SECURITY / AUTH
    # =========================
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REQUIRE_SECURE_SECRETS: bool = True

    MASTER_ADMIN_USERNAME: str = ""
    MASTER_ADMIN_PASSWORD_HASH: str = ""

    # =========================
    # 🗄 DATABASE
    # =========================
    DATABASE_URL: str

    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600

    # =========================
    # 🚦 RATE LIMITING
    # =========================
    AUTH_RATE_LIMIT: int = 100
    AUTH_RATE_WINDOW_SECONDS: int = 60

    API_RATE_LIMIT: int = 300
    API_RATE_WINDOW_SECONDS: int = 60

    # =========================
    # 🔁 REDIS (OPTIONAL)
    # =========================
    REDIS_URL: str | None = None
    ENABLE_DISTRIBUTED_RATE_LIMITING: bool = False

    # =========================
    # 📩 SMS / THIRD PARTY
    # =========================
    SMS_API_URL: str | None = None
    SMS_API_KEY: str | None = None
    SMS_SENDER_ID: str | None = None
    SMS_MAX_RETRY: int = 3

    # =========================
    # 🌐 CORS
    # =========================
    CORS_ALLOWED_ORIGINS: str = ",".join(
        [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]
    )

    # =========================
    # 🧠 VALIDATORS
    # =========================

    @field_validator("DATABASE_URL")
    @classmethod
    def fix_render_db_url(cls, v: str) -> str:
        if not v:
            raise ValueError("❌ DATABASE_URL is not set")

        # Render provides postgres:// → SQLAlchemy needs postgresql://
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql://", 1)

        return v

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if not v or len(v) < 32:
            raise ValueError("❌ SECRET_KEY must be at least 32 characters long")
        return v

    # =========================
    # 🎯 HELPERS
    # =========================

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",")]


# =========================
# 🔧 LOAD SETTINGS FROM ENV
# =========================

settings = Settings(
    SECRET_KEY=os.getenv("SECRET_KEY"),
    DATABASE_URL=os.getenv("DATABASE_URL"),

    ALGORITHM=os.getenv("ALGORITHM", "HS256"),
    ACCESS_TOKEN_EXPIRE_MINUTES=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120")),
    REFRESH_TOKEN_EXPIRE_DAYS=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")),
    REQUIRE_SECURE_SECRETS=os.getenv("REQUIRE_SECURE_SECRETS", "true").lower() == "true",

    MASTER_ADMIN_USERNAME=os.getenv("MASTER_ADMIN_USERNAME", ""),
    MASTER_ADMIN_PASSWORD_HASH=os.getenv("MASTER_ADMIN_PASSWORD_HASH", ""),

    DB_POOL_SIZE=int(os.getenv("DB_POOL_SIZE", "10")),
    DB_MAX_OVERFLOW=int(os.getenv("DB_MAX_OVERFLOW", "20")),
    DB_POOL_TIMEOUT=int(os.getenv("DB_POOL_TIMEOUT", "30")),
    DB_POOL_RECYCLE=int(os.getenv("DB_POOL_RECYCLE", "3600")),

    AUTH_RATE_LIMIT=int(os.getenv("AUTH_RATE_LIMIT", "100")),
    AUTH_RATE_WINDOW_SECONDS=int(os.getenv("AUTH_RATE_WINDOW_SECONDS", "60")),
    API_RATE_LIMIT=int(os.getenv("API_RATE_LIMIT", "300")),
    API_RATE_WINDOW_SECONDS=int(os.getenv("API_RATE_WINDOW_SECONDS", "60")),

    REDIS_URL=os.getenv("REDIS_URL"),
    ENABLE_DISTRIBUTED_RATE_LIMITING=os.getenv(
        "ENABLE_DISTRIBUTED_RATE_LIMITING", "false"
    ).lower()
    == "true",

    SMS_API_URL=os.getenv("SMS_API_URL"),
    SMS_API_KEY=os.getenv("SMS_API_KEY"),
    SMS_SENDER_ID=os.getenv("SMS_SENDER_ID"),
    SMS_MAX_RETRY=int(os.getenv("SMS_MAX_RETRY", "3")),

    CORS_ALLOWED_ORIGINS=os.getenv("CORS_ALLOWED_ORIGINS", Settings.model_fields["CORS_ALLOWED_ORIGINS"].default),
)