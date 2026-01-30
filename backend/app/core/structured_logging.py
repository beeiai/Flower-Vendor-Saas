"""
Structured logging configuration for security events and audit trails.
Provides JSON-formatted logs suitable for SIEM integration.
"""
import json
import logging
import sys
import os
import uuid
from datetime import datetime
from typing import Any, Dict, Optional
import traceback
from contextvars import ContextVar

# Context variable for request ID
request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)

class JSONFormatter(logging.Formatter):
    """Custom formatter that outputs JSON logs for better parsing."""
    
    def format(self, record: logging.LogRecord) -> str:
        # Get request ID from context if available
        request_id = request_id_ctx.get()
        
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "environment": os.getenv("ENVIRONMENT", "development"),
        }
        
        # Add request ID if present
        if request_id:
            log_entry["request_id"] = request_id
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info)
            }
        
        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in (
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "lineno", "funcName", "created",
                "msecs", "relativeCreated", "thread", "threadName",
                "processName", "process", "exc_info", "exc_text",
                "stack_info", "getMessage"
            ):
                log_entry[key] = value
        
        return json.dumps(log_entry, default=str)


def setup_structured_logging(level: str = None):
    """Configure structured logging for the application."""
    # Get log level from environment or default to INFO
    if level is None:
        level = os.getenv("LOG_LEVEL", "INFO")
    
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler with JSON formatter
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(console_handler)
    
    # Security logger (separate namespace)
    security_logger = logging.getLogger("security")
    security_logger.setLevel(logging.INFO)
    
    return root_logger


def log_security_event(event_type: str, details: Dict[str, Any], severity: str = "INFO"):
    """Log a security-relevant event with structured data.
    
    Args:
        event_type: Type of security event (e.g., "login_success", "auth_failure")
        details: Event details dictionary
        severity: Log level ("INFO", "WARNING", "ERROR")
    """
    logger = logging.getLogger("security")
    getattr(logger, severity.lower())(
        "Security event",
        extra={
            "event_type": event_type,
            "details": details,
            "severity": severity
        }
    )


def get_request_id() -> Optional[str]:
    """Get the current request ID from context."""
    return request_id_ctx.get()


def set_request_id(request_id: str) -> None:
    """Set the request ID in context."""
    request_id_ctx.set(request_id)


# Initialize structured logging at module import
setup_structured_logging()