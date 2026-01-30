from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from ..models.saala_customer import SaalaCustomer, SaalaTransaction
from ..schemas.saala import (
    SaalaCustomerCreate, SaalaCustomerUpdate, SaalaCustomerResponse,
    SaalaTransactionCreate, SaalaTransactionUpdate, SaalaTransactionResponse
)
from ..core.dependencies import get_db, get_current_user
from ..models.user import User

router = APIRouter(prefix="/saala", tags=["saala"])


@router.get("/customers/", response_model=List[SaalaCustomerResponse])
def list_saala_customers(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get all SAALA customers for the current vendor.
    """
    customers = db.query(SaalaCustomer).filter(
        SaalaCustomer.vendor_id == user.vendor_id
    ).all()
    return customers


@router.post("/customers/", response_model=SaalaCustomerResponse)
def create_saala_customer(
    customer_data: SaalaCustomerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Create a new SAALA customer.
    """
    customer = SaalaCustomer(
        vendor_id=user.vendor_id,
        name=customer_data.name,
        contact=customer_data.contact,
        address=customer_data.address
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/customers/{customer_id}", response_model=SaalaCustomerResponse)
@router.get("/customers/{customer_id}/", response_model=SaalaCustomerResponse)
def get_saala_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get a specific SAALA customer.
    """
    customer = db.query(SaalaCustomer).filter(
        SaalaCustomer.id == customer_id,
        SaalaCustomer.vendor_id == user.vendor_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="SAALA customer not found")
    
    return customer


@router.put("/customers/{customer_id}", response_model=SaalaCustomerResponse)
@router.put("/customers/{customer_id}/", response_model=SaalaCustomerResponse)
def update_saala_customer(
    customer_id: int,
    customer_data: SaalaCustomerUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Update a SAALA customer.
    """
    customer = db.query(SaalaCustomer).filter(
        SaalaCustomer.id == customer_id,
        SaalaCustomer.vendor_id == user.vendor_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="SAALA customer not found")
    
    # Update fields
    for field, value in customer_data.dict(exclude_unset=True).items():
        setattr(customer, field, value)
    
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/customers/{customer_id}")
@router.delete("/customers/{customer_id}/")
def delete_saala_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Delete a SAALA customer.
    """
    customer = db.query(SaalaCustomer).filter(
        SaalaCustomer.id == customer_id,
        SaalaCustomer.vendor_id == user.vendor_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="SAALA customer not found")
    
    db.delete(customer)
    db.commit()
    return {"message": "SAALA customer deleted successfully"}


@router.get("/customers/{customer_id}/transactions/")
def list_saala_transactions(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get all transactions for a specific SAALA customer.
    """
    customer = db.query(SaalaCustomer).filter(
        SaalaCustomer.id == customer_id,
        SaalaCustomer.vendor_id == user.vendor_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="SAALA customer not found")
    
    # Add joinedload for better performance
    query = db.query(SaalaTransaction)\
        .filter(SaalaTransaction.customer_id == customer_id)
    
    transactions = query.order_by(SaalaTransaction.date.desc()).all()
    
    # Log transaction data
    print(f"Found {len(transactions)} transactions for customer {customer_id}")
    for txn in transactions:
        print(f"Transaction: id={txn.id}, item_code={txn.item_code}, item_name={txn.item_name}, qty={txn.qty}, rate={txn.rate}, total_amount={txn.total_amount}, paid_amount={txn.paid_amount}, balance={txn.balance}")
    
    # Return just the transactions list (frontend expects simple array)
    return transactions


@router.post("/customers/{customer_id}/transactions/", response_model=SaalaTransactionResponse)
def create_saala_transaction(
    customer_id: int,
    transaction_data: SaalaTransactionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    print(f"Creating transaction for customer {customer_id}")
    print(f"Transaction data: {transaction_data.dict()}")
    """
    Create a new transaction for a SAALA customer.
    """
    customer = db.query(SaalaCustomer).filter(
        SaalaCustomer.id == customer_id,
        SaalaCustomer.vendor_id == user.vendor_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="SAALA customer not found")
    
    # Validate required fields
    if not transaction_data.item_name or transaction_data.item_name.strip() == '':
        raise HTTPException(status_code=400, detail="Item name is required")
    
    if transaction_data.qty is None or transaction_data.qty <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
        
    if transaction_data.rate is None or transaction_data.rate <= 0:
        raise HTTPException(status_code=400, detail="Rate must be greater than 0")
    
    print(f"Validated transaction data: item_name='{transaction_data.item_name}', qty={transaction_data.qty}, rate={transaction_data.rate}")
    
    # Log incoming data
    print(f"Incoming transaction data: {transaction_data}")
    
    # Calculate total amount and balance if not provided
    total_amount = transaction_data.total_amount
    if total_amount is None and transaction_data.qty is not None and transaction_data.rate is not None:
        total_amount = transaction_data.qty * transaction_data.rate
    
    paid_amount = transaction_data.paid_amount or 0
    balance = (total_amount or 0) - paid_amount
    
    print(f"Calculated values - Total: {total_amount}, Paid: {paid_amount}, Balance: {balance}")
    
    transaction = SaalaTransaction(
        customer_id=customer_id,
        date=transaction_data.date,
        description=transaction_data.description,
        item_code=transaction_data.item_code,
        item_name=transaction_data.item_name,
        qty=transaction_data.qty,
        rate=transaction_data.rate,
        total_amount=total_amount,
        paid_amount=paid_amount,
        balance=balance
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    # Log the created transaction
    print(f"Created transaction: id={transaction.id}, item_code={transaction.item_code}, item_name={transaction.item_name}, qty={transaction.qty}, rate={transaction.rate}, total_amount={transaction.total_amount}, paid_amount={transaction.paid_amount}, balance={transaction.balance}")
    
    return transaction


@router.get("/transactions/{transaction_id}", response_model=SaalaTransactionResponse)
@router.get("/transactions/{transaction_id}/", response_model=SaalaTransactionResponse)
def get_saala_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get a specific SAALA transaction.
    """
    transaction = db.query(SaalaTransaction).join(SaalaCustomer).filter(
        SaalaTransaction.id == transaction_id,
        SaalaCustomer.vendor_id == user.vendor_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="SAALA transaction not found")
    
    return transaction


@router.put("/transactions/{transaction_id}", response_model=SaalaTransactionResponse)
@router.put("/transactions/{transaction_id}/", response_model=SaalaTransactionResponse)
def update_saala_transaction(
    transaction_id: int,
    transaction_data: SaalaTransactionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Update a SAALA transaction.
    """
    transaction = db.query(SaalaTransaction).join(SaalaCustomer).filter(
        SaalaTransaction.id == transaction_id,
        SaalaCustomer.vendor_id == user.vendor_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="SAALA transaction not found")
    
    print(f"Updating transaction {transaction_id}: {transaction_data.dict()}")
    
    # Store original values for logging
    original_qty = transaction.qty
    original_rate = transaction.rate
    original_total_amount = transaction.total_amount
    original_paid_amount = transaction.paid_amount
    original_balance = transaction.balance
    
    print(f"Original values - qty: {original_qty}, rate: {original_rate}, total_amount: {original_total_amount}, paid_amount: {original_paid_amount}, balance: {original_balance}")
    
    # Calculate total amount and balance if needed
    total_amount = transaction_data.total_amount
    if total_amount is None and transaction_data.qty is not None and transaction_data.rate is not None:
        total_amount = transaction_data.qty * transaction_data.rate
    
    # Only update paid_amount if it was provided in the request
    if transaction_data.paid_amount is not None:
        paid_amount = transaction_data.paid_amount
    else:
        paid_amount = transaction.paid_amount
    
    balance = (total_amount or transaction.total_amount or 0) - paid_amount
    
    print(f"Calculated values - total_amount: {total_amount}, paid_amount: {paid_amount}, balance: {balance}")
    
    # Update fields
    for field, value in transaction_data.dict(exclude_unset=True).items():
        if field not in ['total_amount', 'balance']:  # We calculate these
            setattr(transaction, field, value)
            print(f"Updated field {field} to {value}")
    
    # Only update total_amount if provided in request, otherwise calculate from qty and rate
    if transaction_data.total_amount is not None:
        transaction.total_amount = total_amount
    elif transaction_data.qty is not None and transaction_data.rate is not None:
        transaction.total_amount = total_amount
    else:
        # Keep existing total_amount if neither new value nor both qty/rate are provided
        transaction.total_amount = transaction.total_amount
    
    # Only update paid_amount if provided in request, otherwise keep existing value
    if transaction_data.paid_amount is not None:
        transaction.paid_amount = paid_amount
    else:
        # Keep existing paid_amount if not provided in request
        transaction.paid_amount = transaction.paid_amount
    
    # Always update balance based on current total and paid amounts
    transaction.balance = (transaction.total_amount or 0) - (transaction.paid_amount or 0)
    
    print(f"Final values - qty: {transaction.qty}, rate: {transaction.rate}, total_amount: {transaction.total_amount}, paid_amount: {transaction.paid_amount}, balance: {transaction.balance}")
    
    db.commit()
    db.refresh(transaction)
    
    # Recalculate all balances for this customer after updating
    recalculate_customer_balances(db, transaction.customer_id)
    
    # Refresh transaction after balance recalculation
    db.refresh(transaction)
    
    print(f"Updated transaction: id={transaction.id}, item_code={transaction.item_code}, item_name={transaction.item_name}, qty={transaction.qty}, rate={transaction.rate}, total_amount={transaction.total_amount}, paid_amount={transaction.paid_amount}, balance={transaction.balance}")
    
    return transaction


def recalculate_customer_balances(db: Session, customer_id: int):
    """
    Recalculate all balances for a customer based on all their transactions.
    """
    print(f"Recalculating balances for customer {customer_id}")
    
    transactions = db.query(SaalaTransaction).filter(
        SaalaTransaction.customer_id == customer_id
    ).order_by(SaalaTransaction.id).all()
    
    print(f"Found {len(transactions)} transactions for customer {customer_id}")
    
    running_balance = 0
    for i, transaction in enumerate(transactions):
        print(f"Processing transaction {i+1}: id={transaction.id}, total={transaction.total_amount}, paid={transaction.paid_amount}")
        
        # Calculate the balance contribution of this transaction
        transaction_total = transaction.total_amount or 0
        transaction_paid = transaction.paid_amount or 0
        
        # Update the running balance (outstanding amount)
        running_balance += transaction_total - transaction_paid
        
        print(f"  Transaction balance before update: {transaction.balance}")
        print(f"  Calculated running balance: {running_balance}")
        
        # Update the transaction's balance field
        transaction.balance = running_balance
        
        print(f"  Transaction balance after update: {transaction.balance}")
        
    db.commit()
    
    # Log final summary
    final_transactions = db.query(SaalaTransaction).filter(
        SaalaTransaction.customer_id == customer_id
    ).order_by(SaalaTransaction.id).all()
    
    print(f"Final balances after recalculation for customer {customer_id}:")
    for txn in final_transactions:
        print(f"  Transaction {txn.id}: balance = {txn.balance}")


@router.post("/customers/{customer_id}/payments/")
def add_saala_payment(
    customer_id: int,
    payment_data: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Add a payment from customer to reduce their outstanding balance.
    """
    customer = db.query(SaalaCustomer).filter(
        SaalaCustomer.id == customer_id,
        SaalaCustomer.vendor_id == user.vendor_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="SAALA customer not found")
    
    # Validate payment data
    amount = payment_data.get('amount')
    if amount is None or amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than 0")
    
    description = payment_data.get('description', f"Payment of ₹{amount}")
    date_str = payment_data.get('date', datetime.utcnow().strftime('%Y-%m-%d'))
    
    # Parse date string to datetime
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    print(f"Creating payment transaction: amount={amount}, description={description}, date={date_str}")
    
    # Create a special payment transaction
    payment_transaction = SaalaTransaction(
        customer_id=customer_id,
        date=date,
        description=description,
        item_code="PAYMENT",
        item_name="Payment Received",
        qty=None,
        rate=None,
        total_amount=0,  # No additional debt added
        paid_amount=amount,  # This payment reduces the balance
        balance=0  # Will be recalculated based on all transactions
    )
    
    db.add(payment_transaction)
    db.commit()
    db.refresh(payment_transaction)
    
    print(f"Created payment transaction: id={payment_transaction.id}, paid_amount={payment_transaction.paid_amount}")
    
    # Recalculate all balances for this customer
    print(f"Recalculating balances after payment addition")
    recalculate_customer_balances(db, customer_id)
    
    print(f"Payment added successfully with transaction_id: {payment_transaction.id}")
    
    return {"message": "Payment added successfully", "transaction_id": payment_transaction.id}


@router.delete("/transactions/{transaction_id}")
@router.delete("/transactions/{transaction_id}/")
def delete_saala_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Delete a SAALA transaction.
    """
    transaction = db.query(SaalaTransaction).join(SaalaCustomer).filter(
        SaalaTransaction.id == transaction_id,
        SaalaCustomer.vendor_id == user.vendor_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="SAALA transaction not found")
    
    db.delete(transaction)
    db.commit()
    return {"message": "SAALA transaction deleted successfully"}


@router.get("/customers/{customer_id}/summary/")
def get_saala_customer_summary(
    customer_id: int,
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format (optional)"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get summary information for a SAALA customer including total transactions and balance.
    If date is provided, only transactions for that day are included (no historical).
    """
    customer = db.query(SaalaCustomer).filter(
        SaalaCustomer.id == customer_id,
        SaalaCustomer.vendor_id == user.vendor_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="SAALA customer not found")
    
    print(f"Getting summary for customer {customer_id}, date: {date}")
    
    # Calculate summary statistics
    query = db.query(SaalaTransaction).filter(
        SaalaTransaction.customer_id == customer_id
    )
    
    # Filter by exact date if provided
    if date:
        # Parse the date to ensure it's valid
        try:
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
            query = query.filter(SaalaTransaction.date == date_obj)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    transactions = query.all()
    
    print(f"Found {len(transactions)} transactions for customer {customer_id}")
    
    total_transactions = len(transactions)
    
    # Sum all total_amount values (only positive amounts)
    total_amount = sum(t.total_amount or 0 for t in transactions if (t.total_amount or 0) > 0)
    total_paid = sum(t.paid_amount or 0 for t in transactions)
    
    # Sort transactions by ID to get the final balance (last transaction after chronological sort)
    sorted_transactions = sorted(transactions, key=lambda x: x.id)
    # The current balance should be the final running balance, which is the balance of the last transaction
    current_balance = sorted_transactions[-1].balance if sorted_transactions else 0
    
    # Calculate daily credit when date is provided (sum of total_amount - paid_amount for that day)
    daily_credit = 0
    if date:
        daily_credit = sum(
            max((t.total_amount or 0) - (t.paid_amount or 0), 0) 
            for t in transactions
        )
    
    print(f"FINAL CREDIT: {current_balance}")
    print(f"Daily credit for {date}: {daily_credit}")
    print(f"Summary calculation - total_amount: {total_amount}, total_paid: {total_paid}, current_balance: {current_balance}")
    
    for i, t in enumerate(transactions):
        print(f"  Transaction {i+1}: id={t.id}, date={t.date}, total={t.total_amount}, paid={t.paid_amount}, balance={t.balance}")
    
    response = {
        "customer_id": customer_id,
        "customer_name": customer.name,
        "total_transactions": total_transactions,
        "total_amount": float(total_amount),
        "total_paid": float(total_paid),
        "current_balance": float(current_balance)
    }
    
    # Include daily credit in response when date is provided
    if date:
        response["daily_credit"] = float(daily_credit)
    
    return response


@router.get("/customers/{customer_id}/total-outstanding/")
def get_saala_customer_total_outstanding(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get the total outstanding credit for a SAALA customer (all-time, regardless of date).
    """
    customer = db.query(SaalaCustomer).filter(
        SaalaCustomer.id == customer_id,
        SaalaCustomer.vendor_id == user.vendor_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="SAALA customer not found")
    
    # Calculate total outstanding credit (sum of all balances)
    total_outstanding = (
        db.query(func.sum(SaalaTransaction.balance))
        .filter(SaalaTransaction.customer_id == customer_id)
        .scalar()
    ) or 0
    
    return {
        "customer_id": customer_id,
        "total_outstanding": float(total_outstanding)
    }