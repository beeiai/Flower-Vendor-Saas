from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies import get_current_user
from app.models.catalog import Catalog
from app.schemas.item import ItemCreate, ItemUpdate

router = APIRouter(prefix="/catalog", tags=["Catalog"])


def _to_ui(item: Catalog) -> dict:
    return {
        "id": item.id,
        "itemCode": item.code,
        "itemName": item.name,
        "rate": float(item.rate or 0),
    }


@router.get("/", operation_id="getCatalogItems")
def list_items(q: str | None = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    query = db.query(Catalog).filter(Catalog.vendor_id == user.vendor_id)
    if q:
        like = f"%{q}%"
        query = query.filter((Catalog.name.ilike(like)) | (Catalog.code.ilike(like)))
    rows = query.order_by(Catalog.name.asc()).all()
    return [_to_ui(r) for r in rows]


@router.post("/", status_code=201, operation_id="createCatalogItem")
def create_item(data: ItemCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    code = data.code.strip()
    name = data.name.strip()
    rate = float(data.rate or 0)

    if not code or not name:
        raise HTTPException(status_code=400, detail="Code and name are required")

    exists = db.query(Catalog).filter(Catalog.vendor_id == user.vendor_id, Catalog.code == code).first()
    if exists:
        raise HTTPException(status_code=400, detail="Item code already exists")
    item = Catalog(vendor_id=user.vendor_id, code=code, name=name, rate=rate)
    item = Item(vendor_id=user.vendor_id, code=code, name=name, rate=rate)
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_ui(item)


@router.put("/{item_id}", operation_id="updateCatalogItem")
def update_item(item_id: int, data: ItemUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = db.query(Catalog).filter(Catalog.id == item_id, Catalog.vendor_id == user.vendor_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    if data.name is not None:
        item.name = data.name
    if data.rate is not None:
        item.rate = data.rate

    db.commit()
    db.refresh(item)
    return _to_ui(item)


@router.delete("/{item_id}", operation_id="deleteCatalogItem")
def delete_item(item_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = db.query(Item).filter(Item.id == item_id, Item.vendor_id == user.vendor_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    db.delete(item)
    db.commit()
    return {"message": "Item deleted"}


# Compatibility aliases for potential UI calls
alias = APIRouter(prefix="/items", tags=["Catalog"])


@alias.get("/")
async def list_items_alias(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return list_items(db=db, user=user)


@alias.post("/", status_code=201)
async def create_item_alias(data: ItemCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return create_item(data=data, db=db, user=user)


@alias.put("/{item_id}")
async def update_item_alias(item_id: int, data: ItemUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return update_item(item_id=item_id, data=data, db=db, user=user)


@alias.delete("/{item_id}")
async def delete_item_alias(item_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return delete_item(item_id=item_id, db=db, user=user)
