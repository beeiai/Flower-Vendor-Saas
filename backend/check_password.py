from app.core.db import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        result = conn.execute(text('SELECT password_hash FROM users WHERE email = :email'), {'email': 'admin@test.com'})
        print("Password hash:", result.fetchone())
except Exception as e:
    print("Error:", e)