# Self-Service Signup + Login System

## Overview
This system implements a complete self-service registration and authentication system for the SaaS application.

## Backend API Endpoints

### POST /api/auth/register
Register a new vendor and automatically create an admin user account.

**Request Body:**
```json
{
  "vendor_name": "string (2-100 chars)",
  "owner_name": "string (2-100 chars)",
  "email": "valid email format",
  "password": "string (min 8 chars, 1 uppercase, 1 lowercase, 1 digit)"
}
```

**Response:**
```json
{
  "access_token": "JWT token string",
  "user": {
    "id": integer,
    "email": "email string",
    "role": "Admin User"
  },
  "vendor": {
    "id": integer,
    "name": "vendor name string"
  }
}
```

**Validation:**
- 400: Invalid input (validation errors)
- 409: Email already registered (conflict)
- 500: Server error (generic error)

### POST /api/auth/login (existing)
Login with existing credentials (unchanged).

**Request:**
```
username=email&password=password
```

**Response:**
```json
{
  "access_token": "JWT token string",
  "refresh_token": "refresh token string",
  "token_type": "bearer",
  "expires_in": integer
}
```

## Frontend Components

### AuthTabs Component
- Tabbed interface with Login and Signup forms
- Consistent styling with existing application

### Signup Form Features
- Client-side validation matching backend rules
- Password strength requirements
- Password visibility toggle
- Loading states and error handling
- Responsive design

### Integration Points
- useAuth hook updated to handle registration flow
- Automatic login after successful registration
- Consistent token storage and user data management

## Security Features

### Input Validation
- Backend validation for all fields
- Password strength requirements
- Email format validation
- Length constraints

### Rate Limiting
- 5 registrations per IP per hour
- Distributed rate limiting using Redis (fallback to in-memory)

### Database
- Unique email constraints
- Secure password hashing
- Transactional vendor/user creation

## Implementation Details

### Backend Changes
1. **Schema**: Added RegisterRequest and RegisterResponse models
2. **Route**: POST /api/auth/register endpoint with full validation
3. **Database**: Migration to add is_active column to users table
4. **Security**: Rate limiting and proper error handling

### Frontend Changes
1. **Components**: AuthTabs and Signup form components
2. **Hooks**: Updated useAuth hook to handle registration
3. **Services**: Extended apiService with register endpoint
4. **Integration**: Updated App.jsx to use new auth flow

## Testing

The implementation has been validated to ensure:
- ✅ New vendor can register
- ✅ Vendor auto-logged-in after registration
- ✅ Vendor appears in database
- ✅ User created with ADMIN role
- ✅ Login still works for old users
- ✅ Duplicate email blocked
- ✅ Weak passwords blocked
- ✅ Proper validation and error handling