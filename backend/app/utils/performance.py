"""
Performance utilities for JSON serialization and response optimization.
"""
import json
from datetime import datetime, date
from decimal import Decimal
from typing import Any, Dict, List, Union

# Try to import orjson for better performance, fallback to stdlib json
try:
    import orjson  # More efficient than stdlib json
    HAS_ORJSON = True
except ImportError:
    HAS_ORJSON = False
    orjson = json  # Fallback to stdlib json

def custom_json_serializer(obj: Any) -> Any:
    """
    Custom serializer for non-serializable objects.
    More efficient than using default json.dumps fallback.
    """
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, Decimal):
        return float(obj)
    elif hasattr(obj, '__dict__'):
        # For SQLAlchemy models, extract only necessary attributes
        return obj.__dict__
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def fast_json_dumps(data: Any) -> str:
    """
    Fast JSON serialization using orjson which is significantly faster than stdlib json.
    Falls back to stdlib json if orjson is not available.
    """
    if HAS_ORJSON:
        # orjson handles datetime, decimal, and dataclass serialization automatically
        return orjson.dumps(data).decode('utf-8')
    else:
        # Fallback to stdlib json with custom serializer
        return json.dumps(data, default=custom_json_serializer, separators=(',', ':'))


def optimize_response_payload(data: Dict[str, Any], exclude_fields: List[str] = None) -> Dict[str, Any]:
    """
    Optimize response payload by removing unnecessary fields.
    
    Args:
        data: The response data dictionary
        exclude_fields: Fields to exclude from the response
    
    Returns:
        Optimized response data
    """
    if exclude_fields is None:
        exclude_fields = []
    
    if isinstance(data, dict):
        # Remove excluded fields
        optimized = {k: v for k, v in data.items() if k not in exclude_fields}
        
        # Optimize nested dictionaries
        for key, value in optimized.items():
            if isinstance(value, dict):
                optimized[key] = optimize_response_payload(value, exclude_fields)
            elif isinstance(value, list):
                optimized[key] = [
                    optimize_response_payload(item, exclude_fields) if isinstance(item, dict) 
                    else item for item in value
                ]
        
        return optimized
    
    return data


def truncate_large_fields(data: Dict[str, Any], max_length: int = 1000) -> Dict[str, Any]:
    """
    Truncate very large text fields to prevent oversized responses.
    
    Args:
        data: The response data dictionary
        max_length: Maximum length for string fields
    
    Returns:
        Response data with large fields truncated
    """
    if isinstance(data, dict):
        truncated = {}
        for key, value in data.items():
            if isinstance(value, str) and len(value) > max_length:
                truncated[key] = value[:max_length] + "..."
            elif isinstance(value, dict):
                truncated[key] = truncate_large_fields(value, max_length)
            elif isinstance(value, list):
                truncated[key] = [
                    truncate_large_fields(item, max_length) if isinstance(item, dict) 
                    else item for item in value
                ]
            else:
                truncated[key] = value
        
        return truncated
    
    return data