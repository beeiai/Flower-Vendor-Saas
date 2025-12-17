from sqlalchemy.orm import Session
from app.models.audit import Audit


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

    audit = Audit(
        vendor_id=vendor_id,
        user_id=user_id,
        table_name=table_name,
        record_id=record_id,
        action=action,
        before_data=before_data,
        after_data=after_data
    )

    db.add(audit)
