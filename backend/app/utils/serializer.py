from sqlalchemy.inspection import inspect


def serialize_model(instance):
    """
    Convert SQLAlchemy model to dict
    """
    if instance is None:
        return None

    return {
        c.key: getattr(instance, c.key)
        for c in inspect(instance).mapper.column_attrs
    }
