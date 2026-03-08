# Docker Setup for Flower Vendor SaaS API

## Production-Ready Docker Configuration

This setup provides both development and production configurations for deploying the Flask backend.

## Files Included

- `Dockerfile` - Production-ready container definition
- `.dockerignore` - Files to exclude from the image
- `docker-compose.yml` - Local development setup
- `docker-compose.prod.yml` - Production deployment setup

## Build Instructions

### Local Development

1. **Build and run the development setup:**
```bash
cd backend
docker-compose up --build
```

2. **Access the application:**
   - API: http://localhost:8000
   - Database: http://localhost:5432 (for debugging only)

### Production Deployment

1. **Build the production image:**
```bash
cd backend
docker build -t flower-vendor-api .
```

2. **Run with production compose file:**
```bash
# With environment variables
DATABASE_URL="postgresql://..." SECRET_KEY="your-secret" docker-compose -f docker-compose.prod.yml up -d
```

3. **Or using environment file:**
```bash
# Create .env file with required variables
docker-compose -f docker-compose.prod.yml --env-file .env up -d
```

## Environment Variables

### Required for Production:
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key (should be strong, random value)

### Optional with defaults:
- `ALGORITHM` - Hash algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - JWT expiry (default: 15)
- `REFRESH_TOKEN_EXPIRE_DAYS` - Refresh token expiry (default: 7)
- `DB_POOL_SIZE` - Database connection pool size (default: 10)
- `DB_MAX_OVERFLOW` - Max extra connections (default: 20)
- `REQUIRE_SECURE_SECRETS` - Enforce secure secrets (default: true)
- `GUNICORN_WORKERS` - Number of Gunicorn workers (default: 4)

## Security Features

- Runs as non-root user (UID 1000)
- Minimal base image (python:3.11-slim)
- No build tools in final image
- Health checks enabled
- Proper file permissions
- Environment-based configuration

## Deployment Targets

### Render
Use the Dockerfile directly with these environment variables:
- DATABASE_URL
- SECRET_KEY
- Other optional variables as needed

### DigitalOcean App Platform
- Point to the Dockerfile in your repository
- Configure environment variables in the control panel

### Self-Hosted
- Use docker-compose.prod.yml with proper environment configuration

## Best Practices

1. **Never hardcode secrets** in the Docker image
2. **Use strong, random SECRET_KEY** in production
3. **Configure proper CORS origins** for production
4. **Set appropriate worker counts** based on CPU cores
5. **Use managed database services** instead of containerized DB when possible
6. **Enable SSL/TLS termination** at reverse proxy/load balancer level

## Health Checks

The container includes health checks that verify the API is responding:
- Endpoint: `/api/health`
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3 attempts