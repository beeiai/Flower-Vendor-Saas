from sqlalchemy.orm import Session
from app.models.audit import Audit
import json
from datetime import datetime
from decimal import Decimal

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def log_audit(
    db: Session,
    *,
    vendor_id: int,
    user_id: int | None,
    table_name: str,
    record_id: int,
    action: str,
    before_data: dict | None = None,
    after_data: dict | None = None
):
    """
    Generic audit logger for INSERT / UPDATE / DELETE
    """
    
    # Serialize datetime and Decimal objects for JSON storage
    serialized_before_data = None
    serialized_after_data = None
    
    if before_data:
        serialized_before_data = json.loads(json.dumps(before_data, cls=CustomJSONEncoder))
    if after_data:
        serialized_after_data = json.loads(json.dumps(after_data, cls=CustomJSONEncoder))

    audit = Audit(
        vendor_id=vendor_id,
        user_id=user_id,
        table_name=table_name,
        record_id=record_id,
        action=action,
        before_data=serialized_before_data,
        after_data=serialized_after_data
    )

    db.add(audit)
