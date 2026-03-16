# Docker Deployment

Deploy the full Shadow stack using Docker Compose.

## Full Stack Deployment

```bash
docker compose up --build
```

This builds and starts all services:

| Service         | Port  | Description                     |
|-----------------|-------|---------------------------------|
| Web App         | 3000  | Main React SPA (Nginx)          |
| Admin Panel     | 3001  | Admin dashboard (Nginx)         |
| API Server      | 3002  | Hono REST API + Socket.IO       |
| PostgreSQL      | 5432  | Primary database                |
| Redis           | 16379 | Cache, sessions, presence       |
| MinIO           | 9000  | S3-compatible object storage    |
| MinIO Console   | 9001  | Object storage admin UI         |

## Default Credentials

| Service     | Username / Email       | Password       |
|-------------|------------------------|----------------|
| Admin App   | `admin@shadowob.app`   | `admin123456`  |
| PostgreSQL  | `shadow`               | `shadow`       |
| MinIO       | `minioadmin`           | `minioadmin`   |

## Production Considerations

### Environment Variables

For production deployments, override default values:

```bash
# Create a .env file
DATABASE_URL=postgres://user:strongpassword@db-host:5432/shadow
REDIS_URL=redis://redis-host:6379
JWT_SECRET=a-very-long-random-secret
S3_ENDPOINT=https://your-s3-endpoint
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

### Security Checklist

- [ ] Change all default passwords (PostgreSQL, MinIO, admin account)
- [ ] Set a strong `JWT_SECRET`
- [ ] Use HTTPS with a reverse proxy (Nginx, Caddy, Traefik)
- [ ] Enable Redis authentication
- [ ] Restrict external port access via firewall
- [ ] Configure S3 bucket policies for MinIO

### HTTPS with Reverse Proxy

Place a reverse proxy (e.g., Nginx or Caddy) in front of the services. The Web and Admin apps are served as static files via Nginx containers. The API server handles both REST and WebSocket traffic on port 3002.

Example Nginx upstream config:

```nginx
upstream api {
    server localhost:3002;
}

server {
    listen 443 ssl;
    server_name shadowob.com;

    location / {
        proxy_pass http://localhost:3000;
    }

    location /api/ {
        proxy_pass http://api;
    }

    location /socket.io/ {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Tear Down

```bash
# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (full reset)
docker compose down -v
```

## Infrastructure Only

For local development, run only infrastructure services:

```bash
docker compose up postgres redis minio -d
```

Then start application servers natively:

```bash
pnpm dev
```
