from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.dependencies import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.models.vendor import Vendor
from app.models.farmer import Farmer
from app.services.sms_service import send_sms

router = APIRouter()


@router.post("/sms/send")
def send_single_sms(
    phone: str,
    message: str,
    vendor_id: Optional[int] = None,
    farmer_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a single SMS to a specified phone number with a custom message
    """
    try:
        # Validate inputs
        if not phone or len(phone.strip()) == 0:
            raise HTTPException(status_code=400, detail="Phone number is required")
        
        if not message or len(message.strip()) == 0:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # If vendor_id is not provided, try to infer from current user
        if not vendor_id:
            vendor = db.query(Vendor).filter(Vendor.admin_user_id == current_user.id).first()
            if vendor:
                vendor_id = vendor.id
        
        if not vendor_id:
            raise HTTPException(status_code=400, detail="Vendor ID is required")
        
        # Send the SMS
        sms_log = send_sms(
            db=db,
            vendor_id=vendor_id,
            phone=phone,
            message=message,
            sms_type="single_message",
            farmer_id=farmer_id
        )
        
        return {"success": True, "message": "SMS sent successfully", "log_id": sms_log.id}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {str(e)}")


@router.get("/sms/logs")
def get_sms_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    """
    Get SMS logs for the current user's vendor
    """
    try:
        # Find the vendor associated with the current user
        vendor = db.query(Vendor).filter(Vendor.admin_user_id == current_user.id).first()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        
        # Query SMS logs for this vendor
        from app.models.sms_log import SMSLog
        sms_logs = db.query(SMSLog)\
            .filter(SMSLog.vendor_id == vendor.id)\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        return {"logs": sms_logs}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve SMS logs: {str(e)}")