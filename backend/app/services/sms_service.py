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
    farmer_id: int | None = None,
    template_variables: dict | None = None
):
    """
    Send SMS with retry + logging
    
    Args:
        db: Database session
        vendor_id: Vendor ID
        phone: Recipient phone number
        message: For DLT - this should be the Template ID. For non-DLT - the actual message
        sms_type: Type of SMS (e.g., "collection_received", "settlement_generated")
        farmer_id: Optional farmer ID
        template_variables: Dictionary of variables for DLT template substitution
                         Example: {"customer_name": "John", "amount": "1000"}
    """

    max_retry = int(settings.SMS_MAX_RETRY)
    attempt = 0
    status = "FAILED"

    # Check if DLT mode is enabled (when template_id is configured)
    is_dlt_mode = bool(settings.SMS_TEMPLATE_ID)

    while attempt < max_retry:
        try:
            if is_dlt_mode:
                # DLT-compliant API request format (Fast2SMS DLT route)
                payload = {
                    "route": settings.SMS_DLT_ROUTE,
                    "sender_id": settings.SMS_SENDER_ID,
                    "template_id": settings.SMS_TEMPLATE_ID,
                    "numbers": phone,
                }
                
                # Add template variables if provided
                if template_variables:
                    # Convert dict to comma-separated key=value format if needed by API
                    # Fast2SMS expects variables_values as string or array
                    if isinstance(template_variables, dict):
                        # For single variable or when API expects array
                        values_list = list(template_variables.values())
                        if len(values_list) == 1:
                            payload["variables_values"] = values_list[0]
                        else:
                            payload["variables_values"] = values_list
                    else:
                        payload["variables_values"] = template_variables
            else:
                # Traditional SMS format (non-DLT)
                payload = {
                    "api_key": settings.SMS_API_KEY,
                    "sender": settings.SMS_SENDER_ID,
                    "to": phone,
                    "message": message
                }

            response = requests.post(
                settings.SMS_API_URL,
                json=payload,
                headers={
                    "authorization": settings.SMS_API_KEY,
                    "Content-Type": "application/json"
                } if is_dlt_mode else {},
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
    db.commit()
    db.refresh(sms_log)
    
    return sms_log
