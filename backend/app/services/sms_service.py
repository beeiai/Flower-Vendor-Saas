import requests
from sqlalchemy.orm import Session
from time import sleep

from app.core.config import settings
from app.models.sms_log import SMSLog


def send_sms(
    *,
    db: Session,
    vendor_id: int,
    phone: str,
    message: str,
    sms_type: str,
    farmer_id: int | None = None
):
    """
    Send SMS with retry + logging
    """

    max_retry = int(settings.SMS_MAX_RETRY)
    attempt = 0
    status = "FAILED"

    while attempt < max_retry:
        try:
            response = requests.post(
                settings.SMS_API_URL,
                json={
                    "api_key": settings.SMS_API_KEY,
                    "sender": settings.SMS_SENDER_ID,
                    "to": phone,
                    "message": message
                },
                timeout=5
            )

            if response.status_code == 200:
                status = "SENT"
                break

        except Exception:
            pass

        attempt += 1
        sleep(1)  # short backoff

    # Log SMS
    sms_log = SMSLog(
        vendor_id=vendor_id,
        farmer_id=farmer_id,
        phone=phone,
        sms_type=sms_type,
        message=message,
        status=status
    )

    db.add(sms_log)
