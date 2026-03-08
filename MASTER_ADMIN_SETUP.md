# Master Admin Setup Guide

## Overview
This document describes the new onboarding model that replaces public self-service signup with a master admin controlled vendor creation system.

## Changes Summary
- Public registration endpoint (`/api/auth/register`) is disabled and returns 404
- Master admin can create vendors through protected endpoints
- Master admin credentials are stored securely in database
- Master admin password can be changed through admin interface

## Environment Variables
Add these to your `.env` file:

```
MASTER_ADMIN_USERNAME=your_master_username
MASTER_ADMIN_PASSWORD_HASH=your_bcrypt_hashed_password
```

## Setup Process

### 1. Initial Setup
During first deployment, you need to initialize the master admin credentials in the database:

```bash
# Example using Python to hash and insert credentials
python -c "
from app.core.security import hash_password
from app.core.db import engine
from sqlalchemy import text

username = 'your_master_admin_username'
password = 'your_secure_password'
password_hash = hash_password(password)

with engine.connect() as conn:
    conn.execute(
        text('INSERT INTO system_settings (key, value) VALUES (:key, :value)'),
        {'key': 'MASTER_ADMIN_USERNAME', 'value': username}
    )
    conn.execute(
        text('INSERT INTO system_settings (key, value) VALUES (:key, :value)'),
        {'key': 'MASTER_ADMIN_PASSWORD_HASH', 'value': password_hash}
    )
    conn.commit()
"
```

### 2. API Endpoints

#### Master Admin Authentication
- `POST /api/auth/master-login` - Authenticate as master admin
- Requires: `{ "username": "...", "password": "..." }`
- Returns: JWT token with 10-minute TTL

#### Vendor Creation
- `POST /api/admin/create-vendor` - Create new vendor and admin user
- Headers: `Authorization: Bearer <master_token>`
- Requires: `{ "vendor_name": "...", "owner_name": "...", "email": "...", "password": "..." }`

#### Change Master Password
- `POST /api/admin/change-master-password` - Change master admin password
- Headers: `Authorization: Bearer <master_token>`
- Requires: `{ "old_password": "...", "new_password": "..." }`

### 3. Frontend Changes
- Removed signup tab from login page
- Added "Admin" button in top-right corner of login page
- Added modal dialogs for master admin workflows
- Added new API methods in `apiService.js`

## Security Features
- Constant-time comparison to prevent timing attacks
- Rate limiting on master endpoints
- Detailed security logging
- Secure password hashing
- JWT token validation with 2-hour expiration for vendor access
- Email format validation
- Password strength requirements

## Troubleshooting
- If master admin credentials are lost, you'll need to directly update the `system_settings` table in the database
- Master admin tokens expire after 10 minutes for security
- Make sure to set the environment variables before starting the application