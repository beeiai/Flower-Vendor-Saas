import bcrypt


def hash_password(password: str) -> str:
    # Ensure the password is in bytes
    if isinstance(password, str):
        password = password.encode('utf-8')
    # Hash the password
    hashed = bcrypt.hashpw(password, bcrypt.gensalt())
    # Return as string
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Ensure both inputs are in bytes
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    # Verify the password
    return bcrypt.checkpw(plain_password, hashed_password)
