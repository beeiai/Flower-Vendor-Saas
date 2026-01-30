"""
Utility functions for input validation and sanitization.
Provides centralized validation logic to prevent injection attacks.
"""
import re
from typing import Any, Dict, List, Optional, Union
from html import escape
import unicodedata


def sanitize_string(value: str, max_length: Optional[int] = None) -> str:
    """Sanitize string input to prevent XSS and injection attacks.
    
    Args:
        value: String to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
    """
    if not isinstance(value, str):
        raise ValueError("Value must be a string")
    
    # Strip leading/trailing whitespace
    sanitized = value.strip()
    
    # Truncate if needed
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    # HTML escape to prevent XSS
    sanitized = escape(sanitized)
    
    # Normalize unicode to prevent homograph attacks
    sanitized = unicodedata.normalize('NFKC', sanitized)
    
    return sanitized


def validate_phone_number(phone: str) -> bool:
    """Validate phone number format.
    
    Args:
        phone: Phone number string
        
    Returns:
        True if valid, False otherwise
    """
    if not isinstance(phone, str):
        return False
    
    # Remove spaces, dashes, parentheses
    clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
    
    # Check if it's numeric and reasonable length
    if not clean_phone.isdigit():
        return False
    
    # Indian mobile numbers: 10 digits starting with 6-9
    if len(clean_phone) == 10 and clean_phone[0] in '6789':
        return True
    
    # With country code (91)
    if len(clean_phone) == 12 and clean_phone.startswith('91') and clean_phone[2] in '6789':
        return True
    
    return False


def validate_email_format(email: str) -> bool:
    """Validate email format (basic validation).
    
    Args:
        email: Email string
        
    Returns:
        True if valid, False otherwise
    """
    if not isinstance(email, str):
        return False
    
    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip()))


def validate_numeric_range(
    value: Union[int, float], 
    min_val: Union[int, float], 
    max_val: Union[int, float]
) -> bool:
    """Validate numeric value is within range.
    
    Args:
        value: Number to validate
        min_val: Minimum allowed value
        max_val: Maximum allowed value
        
    Returns:
        True if valid, False otherwise
    """
    try:
        num_value = float(value)
        return min_val <= num_value <= max_val
    except (ValueError, TypeError):
        return False


def sanitize_dict_values(data: Dict[str, Any], rules: Dict[str, Dict]) -> Dict[str, Any]:
    """Apply sanitization rules to dictionary values.
    
    Args:
        data: Dictionary to sanitize
        rules: Rules for each field {field_name: {type, max_length, ...}}
        
    Returns:
        Sanitized dictionary
    """
    sanitized = {}
    
    for key, value in data.items():
        if key not in rules:
            continue  # Skip unknown fields (extra="forbid" in Pydantic handles this)
            
        rule = rules[key]
        field_type = rule.get('type', 'string')
        
        if value is None:
            sanitized[key] = None
            continue
            
        try:
            if field_type == 'string':
                max_len = rule.get('max_length')
                sanitized[key] = sanitize_string(str(value), max_len)
                
            elif field_type == 'integer':
                sanitized[key] = int(value)
                
            elif field_type == 'float':
                sanitized[key] = float(value)
                
            elif field_type == 'boolean':
                if isinstance(value, str):
                    sanitized[key] = value.lower() in ('true', '1', 'yes')
                else:
                    sanitized[key] = bool(value)
                    
            else:
                sanitized[key] = value
                
        except (ValueError, TypeError):
            # Keep original value if conversion fails - let Pydantic handle validation
            sanitized[key] = value
    
    return sanitized


def prevent_sql_injection(value: str) -> str:
    """Basic SQL injection prevention for raw queries (if any).
    
    Args:
        value: String to sanitize
        
    Returns:
        Sanitized string
    """
    if not isinstance(value, str):
        return str(value)
    
    # Remove common SQL injection patterns
    dangerous_patterns = [
        r"(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute)",
        r"[;'\"]",  # Semicolons and quotes
        r"--",      # SQL comments
        r"/\*",     # Block comments start
        r"\*/",     # Block comments end
    ]
    
    sanitized = value
    for pattern in dangerous_patterns:
        sanitized = re.sub(pattern, "", sanitized)
    
    return sanitized.strip()


def validate_pagination_params(page: int = 1, size: int = 50) -> tuple[int, int]:
    """Validate and normalize pagination parameters.
    
    Args:
        page: Page number (1-indexed)
        size: Page size
        
    Returns:
        Tuple of (validated_page, validated_size)
    """
    # Ensure positive integers
    page = max(1, int(page)) if isinstance(page, (int, float)) else 1
    size = max(1, min(100, int(size))) if isinstance(size, (int, float)) else 50  # Cap at 100
    
    return page, size


# Predefined validation rules for common fields
VALIDATION_RULES = {
    'name': {'type': 'string', 'max_length': 100},
    'email': {'type': 'string', 'max_length': 255},
    'phone': {'type': 'string', 'max_length': 20},
    'address': {'type': 'string', 'max_length': 500},
    'description': {'type': 'string', 'max_length': 1000},
    'remarks': {'type': 'string', 'max_length': 500},
    'vehicle_number': {'type': 'string', 'max_length': 20},
    'item_code': {'type': 'string', 'max_length': 50},
    'item_name': {'type': 'string', 'max_length': 100},
}