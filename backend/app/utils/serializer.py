from sqlalchemy.inspection import inspect
import json
from datetime import datetime, date
from decimal import Decimal


def convert_for_json(obj):
    """
    Convert non-JSON serializable objects to JSON-compatible types
    """
    if obj is None:
        return None
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, bytes):
        return obj.decode('utf-8')
    else:
        return obj

def serialize_model(instance):
    """
    Convert SQLAlchemy model to dict
    """
    if instance is None:
        return None

    return {
        c.key: convert_for_json(getattr(instance, c.key))
        for c in inspect(instance).mapper.column_attrs
    }
