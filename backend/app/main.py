from fastapi import FastAPI
from sqlalchemy import text
from app.core.db import engine
from app.routes.auth import router as auth_router
from app.routes.settlements import router as settlement_router
from fastapi.staticfiles import StaticFiles


app = FastAPI(
    title="Flower Vendor SaaS API",
    version="1.0.0"
)

app.include_router(auth_router)
app.include_router(settlement_router)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def home():
    return {"message": "API is running"}

@app.get("/db-test")
def test_db():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            return {"db": "connected", "result": result.scalar()}
    except Exception as e:
        return {"db": "error", "details": str(e)}
