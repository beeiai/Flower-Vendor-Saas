from sqlalchemy import event
from sqlalchemy.orm import Session

from app.models.audit import Audit
from app.utils.serializer import serialize_model


# Temporary storage for before states
_session_before_data = {}


@event.listens_for(Session, "before_flush")
def before_flush(session, flush_context, instances):
    """
    Capture BEFORE state for updates & deletes
    """
    for obj in session.dirty:
        if session.is_modified(obj, include_collections=False):
            _session_before_data[id(obj)] = serialize_model(obj)

    for obj in session.deleted:
        _session_before_data[id(obj)] = serialize_model(obj)


@event.listens_for(Session, "after_flush")
def after_flush(session, flush_context):
    """
    Create audit logs AFTER DB flush
    """
    for obj in session.new:
        create_audit(session, obj, action="INSERT")

    for obj in session.dirty:
        if session.is_modified(obj, include_collections=False):
            create_audit(session, obj, action="UPDATE")

    for obj in session.deleted:
        create_audit(session, obj, action="DELETE")


def create_audit(session, obj, action: str):
    """
    Generic audit creator
    """
    # Skip auditing Audit table itself
    if obj.__class__.__name__ == "Audit":
        return

    table_name = obj.__tablename__
    record_id = getattr(obj, "id", None)

    before_data = _session_before_data.pop(id(obj), None)
    after_data = serialize_model(obj) if action != "DELETE" else None

    # Extract context (we attach this manually)
    vendor_id = getattr(session.info.get("vendor"), "id", None)
    user_id = getattr(session.info.get("user"), "id", None)

    if not vendor_id:
        return  # skip system operations

    audit = Audit(
        vendor_id=vendor_id,
        user_id=user_id,
        table_name=table_name,
        record_id=record_id or 0,
        action=action,
        before_data=before_data,
        after_data=after_data
    )

    session.add(audit)
