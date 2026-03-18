# Messenger

Private messaging application with activation-key-based registration. No email, no phone number — users receive a pre-generated one-time key to create their account.

## Architecture

- **Backend**: Node.js + TypeScript + Express 5 + Socket.io
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache / Presence**: Redis (ioredis)
- **File Storage**: MinIO (S3-compatible, self-hosted)
- **Auth**: JWT + bcrypt activation keys
- **Frontend**: React + TypeScript *(coming soon)*

## Local Setup — Backend

### 1. Start infrastructure

```bash
docker compose up -d postgres redis minio
```

This starts PostgreSQL (port 5432), Redis (port 6379), and MinIO (port 9000).

MinIO console is available at http://localhost:9001 (login: minioadmin / minioadmin).

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` work with the docker-compose services out of the box. Generate real secrets for `JWT_SECRET` and `JWT_REFRESH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Install dependencies

```bash
npm install
```

### 4. Generate Prisma client and run migrations

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Generate activation keys

```bash
npx ts-node scripts/generateKeys.ts 5
```

This prints 5 raw keys to stdout. Save them — they're hashed in the database and cannot be recovered.

### 6. Start the dev server

```bash
npm run dev
```

Server runs on http://localhost:3000. Health check: `GET /health`.

### 7. Test it

```bash
# Activate a key (use one of the generated keys)
curl -X POST http://localhost:3000/api/auth/activate \
  -H "Content-Type: application/json" \
  -d '{"key": "XXXX-XXXX-XXXX-XXXX", "username": "alice"}'

# Use the returned JWT
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <token>"
```

## Local Setup — Frontend

*Section will be filled once the frontend project is set up.*

## Self-hosted Git (Gitea)

```bash
docker compose up -d gitea gitea-db
```

Gitea is available at http://localhost:3001. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup details.

## API Overview

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/activate | No | Register with activation key |
| POST | /api/auth/refresh | No | Refresh JWT |
| GET | /api/users/me | Yes | Own profile |
| PATCH | /api/users/me | Yes | Update profile |
| GET | /api/users/:id | Yes | User profile |
| GET | /api/users/search?q= | Yes | Search users |
| POST | /api/chats | Yes | Create chat |
| GET | /api/chats | Yes | List own chats |
| GET | /api/chats/:id | Yes | Chat details |
| GET | /api/chats/:id/messages | Yes | Paginated messages |
| DELETE | /api/messages/:id | Yes | Soft-delete message |
| POST | /api/files/upload | Yes | Upload file |

## Socket.io Events

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full event reference.
