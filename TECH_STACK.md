# Tech Stack - Universal Scheduler (Nurse Edition)

> **Last Updated**: 20 November 2025

This document defines the complete technology stack for the Universal Scheduler project, covering both the **Web Application** (Next.js) and the **Solver Engine** (Python).

---

## 🏗️ Architecture Overview

The system is split into **two independent services**:

1. **`/web`** - Next.js Full-Stack Application (Frontend + Backend API)
2. **`/engine`** - Python FastAPI Solver Service (Mathematical Engine)

```
┌─────────────────────────────────────────────────────┐
│                    /web (Next.js)                    │
│  ┌──────────────┐         ┌──────────────────────┐  │
│  │   Frontend   │◄────────┤   Backend API        │  │
│  │  (React UI)  │         │  (Next.js Routes)    │  │
│  └──────────────┘         └──────────────────────┘  │
│         │                          │                 │
│         │                          │                 │
│         ▼                          ▼                 │
│  ┌──────────────────────────────────────────────┐   │
│  │         PostgreSQL Database                   │   │
│  │  (Auth, Staff, Constraints, Schedules)        │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                           │
                           │ HTTP API Call
                           ▼
┌─────────────────────────────────────────────────────┐
│              /engine (Python FastAPI)               │
│  ┌──────────────────────────────────────────────┐   │
│  │     OR-Tools Solver Engine                   │   │
│  │  (Receives JSON → Returns Schedule Matrix)   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | Next.js | Latest (15.x) | React framework for UI |
| **Language** | TypeScript | 5.x | Type-safe JavaScript |
| **Backend API** | Next.js API Routes | - | REST endpoints for web app |
| **Database** | PostgreSQL | 16.x | Relational data storage |
| **ORM** | Prisma | 7.x | Type-safe database access |
| **DB Driver** | @prisma/adapter-pg + pg | Latest | PostgreSQL driver adapter |
| **Auth** | NextAuth.js (Auth.js) | 5.x | Authentication & sessions |
| **Validation** | Zod | 3.x | Runtime schema validation |
| **UI Components** | shadcn/ui | Latest | Accessible component library |
| **Solver Engine** | Python + FastAPI | 3.10+ / 0.104+ | Mathematical optimization API |
| **Solver Library** | Google OR-Tools | 9.8+ | Constraint programming |

---

## 🌐 Web Application (`/web`)

### Core Stack

#### Framework: **Next.js** (Latest)
- **Why**: Industry-standard React framework with built-in SSR, routing, and API routes
- **Role**: Serves as both Frontend UI and Main Backend API
- **Features Used**:
  - App Router (not Pages Router)
  - Server Components for optimal performance
  - API Routes for REST endpoints
  - Middleware for auth protection

#### Language: **TypeScript** (5.x)
- **Why**: Essential for complex business logic; catches errors at compile-time
- **Strictness**: `strict: true` in `tsconfig.json`
- **Usage**: 100% of codebase (no `.js` files)

#### Database: **PostgreSQL** (16.x)
- **Why**: Reliable relational database for structured data
- **Development**: Local Docker container
- **Production Options**: Supabase or Neon (to be decided)
- **Connection**: Via Prisma ORM

#### ORM: **Prisma** (7.x)
- **Why**: Type-safe database queries, excellent TypeScript integration
- **Driver Adapter**: Uses `@prisma/adapter-pg` with native `pg` driver for optimal Next.js compatibility
- **Features**:
  - Auto-generated types from schema
  - Migration management
  - Prisma Studio for DB inspection
  - Connection pooling via pg Pool
- **Schema Location**: `/web/prisma/schema.prisma`
- **Client Setup**: Connection pool with adapter pattern for serverless compatibility

#### Authentication: **NextAuth.js** (Auth.js v5)
- **Why**: Battle-tested auth solution for Next.js
- **Providers**:
  - Google OAuth
  - Email Magic Link
- **Session Storage**: Database (PostgreSQL via Prisma Adapter)
- **Session Strategy**: JWT + Database hybrid

#### Validation: **Zod** (3.x)
- **Why**: Runtime type validation with TypeScript inference
- **Usage**:
  - API input validation
  - Form validation
  - Environment variable validation
- **Example**: Staff name must be non-empty, constraint values must be positive

#### UI Components: **shadcn/ui** (Latest)
- **Why**: High-quality, accessible component library built on Radix UI primitives
- **Philosophy**: Copy-paste components (not npm package), full ownership of code
- **Styling**: Uses Tailwind CSS for customization
- **Components**: Button, Form, Dialog, Select, Calendar, Table, etc.
- **Accessibility**: WCAG 2.1 compliant via Radix UI
- **Setup**: `npx shadcn-ui@latest init`
- **Key Dependencies**:
  - `@radix-ui/react-*` - Unstyled accessible components
  - `class-variance-authority` - Component variant management
  - `tailwind-merge` - Conflict-free Tailwind class merging

---

### Web Project Structure

```
/web
├── .nvmrc                      # Node version: v20.11.0
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts          # Tailwind + shadcn/ui config
├── components.json             # shadcn/ui configuration
├── .env.local                  # Local environment variables
│
├── /prisma
│   ├── schema.prisma           # Database schema
│   └── /migrations             # Migration history
│
├── /src
│   ├── /app                    # Next.js App Router
│   │   ├── /api                # Backend API routes
│   │   │   ├── /auth           # NextAuth endpoints
│   │   │   ├── /staff          # Staff CRUD
│   │   │   ├── /constraints    # Constraint management
│   │   │   └── /solve          # Trigger solver engine
│   │   ├── /dashboard          # Admin CMS pages
│   │   ├── /schedule           # Nurse schedule view
│   │   └── layout.tsx
│   │
│   ├── /components             # React components
│   │   ├── /ui                 # shadcn/ui components (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   └── ...
│   │   ├── /forms              # Custom form components
│   │   └── /schedule           # Schedule display components
│   │
│   ├── /lib                    # Utilities
│   │   ├── utils.ts            # cn() helper for Tailwind
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── auth.ts             # NextAuth config
│   │   ├── engine-client.ts    # Python engine HTTP client
│   │   └── validations.ts      # Zod schemas
│   │
│   └── /types                  # TypeScript types
│       └── index.ts
│
└── /public                     # Static assets
```

---

### Development Tools (Web)

| Tool | Purpose |
|------|---------|
| **nvm** | Node version manager (ensures v20.11.0) |
| **pnpm** | Fast package manager (alternative: npm/yarn) |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Tailwind CSS** | Utility-first CSS framework |
| **shadcn/ui** | Component library built on Radix UI |

---

## 🐍 Solver Engine (`/engine`)

### Core Stack

#### Language: **Python** (3.10+)
- **Why**: Native support for OR-Tools; excellent for mathematical operations
- **Version Management**: `uv` (fast Python package manager)
- **Version File**: `.python-version` (managed by `uv`)

#### Framework: **FastAPI** (0.104+)
- **Why**: Modern async Python web framework with auto-generated docs
- **Features**:
  - Automatic OpenAPI/Swagger docs
  - Pydantic integration for validation
  - High performance (comparable to Node.js)
- **Endpoints**:
  - `POST /api/v1/solve` - Main solver endpoint

#### Solver: **Google OR-Tools** (9.8+)
- **Why**: Industry-leading constraint programming library
- **Module Used**: `ortools.sat.python.cp_model` (CP-SAT Solver)
- **Capabilities**:
  - Integer programming
  - Boolean satisfiability
  - Constraint propagation
- **License**: Apache 2.0 (free for commercial use)

#### Validation: **Pydantic** (2.x)
- **Why**: Data validation using Python type hints
- **Usage**:
  - API request/response models
  - Constraint validation
  - Config validation

---

### Engine Project Structure

```
/engine
├── .python-version             # Python version (managed by uv)
├── pyproject.toml              # Project metadata & dependencies
├── uv.lock                     # Dependency lock file
├── README.md
│
├── /src
│   ├── main.py                 # FastAPI app entry point
│   │
│   ├── /api
│   │   └── /v1
│   │       └── solve.py        # POST /api/v1/solve endpoint
│   │
│   ├── /core
│   │   ├── config.py           # App configuration
│   │   └── schemas.py          # Pydantic models
│   │
│   ├── /services
│   │   ├── solver.py           # OR-Tools logic
│   │   ├── parsers.py          # Constraint parsers
│   │   └── validators.py       # Business logic validation
│   │
│   └── /tests
│       ├── test_solver.py
│       └── test_constraints.py
│
└── /docs
    └── api.md                  # API documentation
```

---

### Development Tools (Engine)

| Tool | Purpose |
|------|---------|
| **uv** | Python package & environment manager |
| **pytest** | Testing framework |
| **black** | Code formatter |
| **ruff** | Fast Python linter |
| **mypy** | Static type checker |
| **uvicorn** | ASGI server for FastAPI |

---

## 🗄️ Database Schema (High-Level)

```
┌─────────────┐
│    User     │  (NextAuth)
├─────────────┤
│ id          │
│ email       │
│ name        │
└─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐
│   Staff     │  (Nurse data)
├─────────────┤
│ id          │
│ name        │
│ employeeId  │
│ orgId       │
└─────────────┘

┌─────────────┐
│ Constraint  │  (Scheduling rules)
├─────────────┤
│ id          │
│ type        │  (point, vertical_sum, etc.)
│ config      │  (JSON)
│ orgId       │
└─────────────┘

┌─────────────┐
│  Schedule   │  (Generated rosters)
├─────────────┤
│ id          │
│ matrix      │  (JSON)
│ status      │
│ createdAt   │
└─────────────┘
```

> Full Prisma schema will be defined in `/web/prisma/schema.prisma`

---

## 🔐 Security Considerations

### Web Application
- **Auth**: NextAuth.js handles OAuth flows and session management
- **CSRF Protection**: Built-in via Next.js
- **Environment Variables**: Never commit `.env.local` to git
- **SQL Injection**: Protected by Prisma (parameterized queries)

### Solver Engine
- **No Code Injection**: Uses safe JSON parsing (no `exec()` or `eval()`)
- **Input Validation**: Pydantic validates all inputs
- **Rate Limiting**: To be implemented in production
- **API Key Auth**: Communication between `/web` and `/engine` secured by API key

---

## 🚀 Development Environment Setup

### Prerequisites

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Docker Desktop (for PostgreSQL)
# Download from: https://www.docker.com/products/docker-desktop
```

### Quick Start

```bash
# 1. Start PostgreSQL in Docker
docker run --name orto-postgres \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=orto_scheduler \
  -p 5432:5432 \
  -d postgres:16

# 2. Setup Web App
cd web
nvm use                    # Uses version from .nvmrc (v20.11.0)
npm install
npx shadcn-ui@latest init  # Initialize shadcn/ui
npx prisma migrate dev     # Run migrations
npm run dev                # Start dev server (localhost:3000)

# 3. Setup Solver Engine
cd ../engine
uv sync                    # Install dependencies
uv run uvicorn src.main:app --reload --port 8000
                          # Start API server (localhost:8000)
```

---

## 📊 Communication Flow

```
User Browser
    │
    │ HTTPS
    ▼
Next.js App (localhost:3000)
    │
    ├─► PostgreSQL (localhost:5432)
    │   (Read/Write staff, constraints, schedules)
    │
    └─► Python Engine (localhost:8000)
        POST /api/v1/solve
        (Only when generating new schedule)
```

---

## 🎯 Version Management

### Node.js (Web)
```bash
# .nvmrc file contents
v20.11.0
```

### Python (Engine)
```bash
# Managed by uv, specified in pyproject.toml
requires-python = ">=3.10"
```

---

## 📝 Configuration Files

### Web: `package.json` Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "next-auth": "^5.0.0",
    "@prisma/client": "^7.0.0",
    "@prisma/adapter-pg": "^7.0.0",
    "pg": "^8.11.0",
    "zod": "^3.22.0",
    "@tanstack/react-query": "^5.90.0",
    "axios": "^1.6.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "prisma": "^7.0.0",
    "@types/node": "^20.0.0",
    "@types/pg": "^8.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

### Engine: `pyproject.toml` Dependencies

```toml
[project]
name = "orto-scheduler-engine"
version = "0.1.0"
requires-python = ">=3.10"

dependencies = [
    "fastapi>=0.104.0",
    "uvicorn[standard]>=0.24.0",
    "pydantic>=2.0.0",
    "ortools>=9.8.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "black>=23.0.0",
    "ruff>=0.1.0",
    "mypy>=1.7.0",
]
```

---

## 🔄 Future Considerations

### Scalability
- **Web**: Deploy on Vercel or AWS with auto-scaling
- **Engine**: Deploy as containerized service (Docker + K8s)
- **Database**: Migrate to managed Postgres (Supabase/Neon) with connection pooling

### Monitoring
- **Web**: Vercel Analytics or Sentry
- **Engine**: Prometheus + Grafana for solver performance metrics
- **Database**: pganalyze or built-in Supabase metrics

### CI/CD
- **Testing**: GitHub Actions for automated tests
- **Deployment**: Automated deployment on merge to `main`
- **Database Migrations**: Automated via Prisma Migrate

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Google OR-Tools Guide](https://developers.google.com/optimization)
- [uv Documentation](https://github.com/astral-sh/uv)

---

**Last Updated**: 20 November 2025  
**Maintained By**: Project Lead
