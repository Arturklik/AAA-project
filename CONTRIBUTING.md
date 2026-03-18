# Contributing to Messenger

## Team

| Role | Responsibilities |
|------|-----------------|
| Backend dev | API, database, sockets, infrastructure |
| Frontend dev | React UI, client-side state, socket integration |
| Designer | UI/UX design, assets, design review |

## Repository Structure

This is a **monorepo**. Both backend and frontend live in the same repository.

```
messenger/
├── backend/         ← Node.js API (you are here)
├── frontend/        ← React app (coming soon)
├── design/          ← Figma exports, icons, assets
├── docker-compose.yml
├── README.md
└── CONTRIBUTING.md
```

**Why monorepo?** With 3 people and no CI/CD, a single repo keeps things simple — one clone, one set of branches, one place to review changes. API contract changes between frontend and backend are visible in the same PR.

## Branching Strategy

```
main ← production-ready, protected (no direct push)
 └── dev ← integration branch, all features merge here
      ├── feature/chat-ui
      ├── feature/file-upload-api
      └── hotfix/socket-disconnect
```

### Branch naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/short-description` | `feature/group-chat-avatars` |
| Hotfix | `hotfix/short-description` | `hotfix/jwt-expiry-check` |

### Rules

1. **Never push directly to `main` or `dev`** — always use pull requests
2. **`main`** is updated only at phase milestones (after team agreement)
3. **`dev`** is the daily integration branch — all feature branches merge here
4. Delete branches after merging

## Workflow: Creating a Feature

```bash
# 1. Make sure you're on dev and up to date
git checkout dev
git pull origin dev

# 2. Create your feature branch
git checkout -b feature/my-feature

# 3. Work, commit often
git add -A
git commit -m "feat(chat): add group avatar upload"

# 4. Push your branch
git push -u origin feature/my-feature

# 5. Open a pull request: feature/my-feature → dev
#    (via Gitea web UI at http://localhost:3001)

# 6. After review + approval, merge via the UI
# 7. Delete the branch after merge
```

## Commit Message Format

```
type(scope): short description
```

### Types

| Type | When to use |
|------|------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code change that doesn't fix a bug or add a feature |
| `chore` | Build process, deps, tooling |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no logic change) |

### Scope

Use the module or area being changed: `auth`, `chat`, `socket`, `files`, `users`, `db`, `ui`, `design`.

### Examples

```
feat(auth): add activation key endpoint
fix(socket): handle disconnect race condition
refactor(chat): extract duplicate-check into helper
chore(deps): update prisma to v7.6
docs(readme): add frontend setup section
style(auth): fix inconsistent indentation
```

### Rules

- Use imperative mood ("add", not "added" or "adds")
- Lowercase first letter after the colon
- No period at the end
- Keep the first line under 72 characters
- Add a blank line + body for complex changes

## Code Review

### Who reviews what

| PR touches | Reviewer |
|-----------|----------|
| Backend only (`backend/`, `prisma/`) | Backend dev |
| Frontend only (`frontend/`) | Frontend dev |
| API contract (routes, socket events, shared types) | **Both** backend + frontend devs |
| Design assets (`design/`) | Designer + one dev |

### Review checklist

- [ ] Code compiles (`npm run build`)
- [ ] No hardcoded secrets or credentials
- [ ] New env vars added to `.env.example`
- [ ] Commit messages follow the format
- [ ] PR description explains *why*, not just *what*

## Merging dev → main

We merge `dev` into `main` at **phase milestones**:

1. Phase 1: Backend API complete + tested
2. Phase 2: Frontend auth + chat UI working
3. Phase 3: File uploads + calls working
4. Phase 4: Polish + deploy

Before merging to `main`:
- All team members confirm `dev` is stable
- Run full build: `npm run build` in both backend and frontend
- Tag the release: `git tag v0.1.0`

## Design Assets

Designers should place exports in the `design/` directory:

```
design/
├── icons/           ← SVG icons for the UI
├── screens/         ← Figma screen exports (PNG/PDF)
├── components/      ← Component-level exports
└── brand/           ← Logo, colors, typography reference
```

Keep files under 5 MB each. For large Figma files, share a link in the PR description instead of committing the file.

## Gitea Setup (Self-hosted Git)

### First-time setup

```bash
# Start Gitea and its database
docker compose up -d gitea gitea-db

# Wait ~30 seconds for startup, then open:
# http://localhost:3001
```

### Initial configuration (web installer)

When you first visit http://localhost:3001, Gitea shows a setup page. Most fields are pre-filled from docker-compose environment variables. Verify:

1. **Database Type**: PostgreSQL *(pre-filled)*
2. **Host**: gitea-db:5432 *(pre-filled)*
3. **Database Name**: gitea *(pre-filled)*
4. **Username**: gitea *(pre-filled)*
5. **Password**: gitea *(pre-filled)*
6. **Site Title**: Messenger Team
7. **Server Domain**: localhost
8. **SSH Server Port**: 222
9. **Gitea Base URL**: http://localhost:3001/
10. **Admin Account**: Create one (e.g. `admin` / strong password)

Click **Install Gitea**.

### Create the organization and repository

```bash
# After logging in as admin:

# 1. Create organization:
#    → Top-right "+" → New Organization
#    → Name: "messenger"
#    → Visibility: Private
#    → Create

# 2. Create repository:
#    → Inside "messenger" org → New Repository
#    → Name: "messenger"
#    → Visibility: Private
#    → Do NOT initialize (we'll push existing code)
#    → Create

# 3. Add team members (Organization → Settings → Teams):

#    Team "developers" (for frontend dev):
#    → Permission: Write
#    → Repositories: messenger/messenger
#    → Add the frontend dev's Gitea account

#    Team "design" (for designer):
#    → Permission: Read
#    → Enable "Issues" permission so they can comment
#    → Repositories: messenger/messenger
#    → Add the designer's Gitea account
```

### Branch protection (via Gitea UI)

Repository → Settings → Branches → Add Rule:

**For `main`:**
- Branch name pattern: `main`
- Enable "Require pull request reviews" (1 approval)
- Enable "Block push"
- Enable "Block force push"

**For `dev`:**
- Branch name pattern: `dev`
- Enable "Block force push"

## Git Setup — Per Team Member

### Backend Dev (repo owner)

```bash
# From the project root (C:\Projects\messenger-backend or equivalent)
cd /path/to/messenger-backend

# Initialize
git init
git checkout -b main

# First commit
git add .gitignore
git commit -m "chore: add gitignore"

git add -A
git commit -m "feat: initial backend implementation

Includes:
- Express API with auth, users, chats, messages, files modules
- Socket.io real-time messaging, presence, and WebRTC signaling
- Prisma schema for PostgreSQL
- MinIO file storage integration
- Redis presence tracking
- Docker Compose for all infrastructure services
- Activation key system with bcrypt hashing"

# Add remote (adjust URL to your Gitea server IP or domain)
git remote add origin http://localhost:3001/messenger/messenger.git

# Push main
git push -u origin main

# Create and push dev branch
git checkout -b dev
git push -u origin dev
```

### Frontend Dev (contributor)

```bash
# Clone
git clone http://localhost:3001/messenger/messenger.git
cd messenger

# Switch to dev (base for all work)
git checkout dev

# Set up backend locally
cp .env.example .env
# Edit .env — set JWT_SECRET and JWT_REFRESH_SECRET to real values
npm install
docker compose up -d postgres redis minio
npx prisma generate
npx prisma migrate dev --name init

# Start first feature branch
git checkout -b feature/react-app-scaffold
# ... work ...
git add -A
git commit -m "feat(ui): scaffold React app with Vite"
git push -u origin feature/react-app-scaffold
# → Open PR to dev via Gitea UI
```

### Designer (read-only + assets)

```bash
# Clone
git clone http://localhost:3001/messenger/messenger.git
cd messenger

# Stay on dev to see latest work
git checkout dev

# To update your local copy
git pull origin dev

# To contribute design assets:
# 1. Ask a dev to create a branch for you, OR
# 2. If you have write access to design/:
mkdir -p design/screens design/icons design/components design/brand
# Drop your exports into the appropriate folder
# Ask a dev to commit and PR them, or commit yourself if permitted
```

## Pre-commit Hook

A pre-commit hook is installed at `.git/hooks/pre-commit` that rejects commits containing hardcoded secrets. It scans staged files for patterns like `JWT_SECRET=actual-value` (not placeholders).

To install after cloning:

```bash
cp hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```
