# Universal Scheduler - Web Application

> **Nurse Edition** | Full-stack Next.js application for intelligent nurse scheduling

This is the web frontend and API layer of the Universal Scheduler project, built with Next.js 15, TypeScript, and Prisma ORM.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 22.x (managed via nvm)
- **PostgreSQL**: 16.x (local or hosted)
- **Package Manager**: npm, yarn, or pnpm

### Installation

```bash
# Use correct Node version
nvm use 22

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your DATABASE_URL

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npx prisma db seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 16.x
- **ORM**: Prisma 7.x with `@prisma/adapter-pg`
- **UI Components**: shadcn/ui + Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Validation**: Zod

---

## 📁 Project Structure

```
/web
├── /prisma
│   ├── schema.prisma          # Database schema
│   └── /migrations            # Migration history
├── /src
│   ├── /app                   # Next.js App Router
│   │   ├── /api               # API routes
│   │   ├── page.tsx           # Home page
│   │   └── layout.tsx         # Root layout
│   ├── /components            # React components
│   │   └── /ui                # shadcn/ui components
│   ├── /features              # Feature modules
│   │   └── /users             # User management feature
│   ├── /lib                   # Utilities
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── utils.ts           # Helper functions
│   └── /providers             # React context providers
│       └── query-provider.tsx # TanStack Query provider
├── /public                    # Static assets
├── .env                       # Environment variables (local)
├── next.config.ts             # Next.js configuration
├── prisma.config.ts           # Prisma configuration
└── package.json
```

---

## 🗄️ Database Setup

### Local PostgreSQL (Docker)

```bash
# Start PostgreSQL container
docker run --name orto-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=orto_dev \
  -p 5432:5432 \
  -d postgres:16

# Verify connection
psql postgresql://postgres:postgres@localhost:5432/orto_dev
```

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/orto_dev?schema=public"
```

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (⚠️ destructive)
npx prisma migrate reset

# Open Prisma Studio to inspect data
npx prisma studio
```

---

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Generate Prisma Client
npx prisma generate
```

### Prisma Client Configuration

The project uses **Prisma 7** with the PostgreSQL driver adapter for optimal Next.js compatibility:

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })
```

This setup ensures:
- ✅ Serverless compatibility (Vercel, AWS Lambda)
- ✅ Connection pooling
- ✅ Proper Next.js integration

---

## 🎨 UI Components

This project uses [shadcn/ui](https://ui.shadcn.com) for accessible, customizable components.

### Adding New Components

```bash
# Add a component
npx shadcn@latest add button
npx shadcn@latest add form
npx shadcn@latest add dialog
```

Components are installed to `src/components/ui/` and can be customized directly.

---

## 📚 Key Features

### Implemented
- ✅ Next.js 15 App Router setup
- ✅ PostgreSQL database with Prisma ORM
- ✅ Prisma 7 with PG adapter
- ✅ shadcn/ui component library
- ✅ TanStack Query for data fetching
- ✅ TypeScript strict mode
- ✅ User management (CRUD)

### In Development
- 🚧 NextAuth.js authentication
- 🚧 Staff management module
- 🚧 Constraint configuration UI
- ✅ Schedule generation (solver integration complete)

---

## 🧪 Testing Solver Integration

The application integrates with a Python solver engine to generate optimal schedules. 

### Prerequisites

1. **Python Engine Running**: 
   ```bash
   cd ../engine
   uv run uvicorn src.main:app --reload
   ```

2. **Database Seeded**:
   ```bash
   npx prisma db seed
   ```

3. **Environment Variables**:
   ```bash
   # In .env
   SOLVER_ENGINE_URL="http://localhost:8000"
   ```

### Run Integration Test

```bash
# Execute standalone test script
npx tsx scripts/test-solver-integration.ts
```

**Expected Output**:
```
🧪 Testing Solver Integration Service
============================================================

📊 Step 1: Fetching test data from database...
   ✅ Found 5 active staff members
   ✅ Found 2 active constraints

🔧 Step 2: Creating roster and calling solver...
   Start Date: 2025-01-20
   Time Slots: 7 days
   Solver URL: http://localhost:8000

✅ Step 3: Roster generated successfully!
   Roster ID: clxxxxx
   Status: COMPLETED
   Duration: 234ms

📋 Step 4: Fetching generated schedule...
   ✅ Found 35 shifts

📅 Generated Schedule:
   ──────────────────────────────────────────────────
   Day:         0  1  2  3  4  5  6
   ──────────────────────────────────────────────────
   Alice        ❌  ✅  ✅  ✅  ❌  ✅  ✅
   Bob          ✅  ✅  ❌  ✅  ✅  ❌  ❌
   ...
```

### Verify Results

```bash
# Open Prisma Studio
npx prisma studio

# Navigate to:
# 1. Roster table → Check status = "COMPLETED"
# 2. Shift table → Verify shifts created
# 3. Staff/Constraint tables → Review test data
```

### Architecture

The solver integration follows this workflow:

```
Next.js App (TypeScript)
    ↓
SolverIntegrationService
    ↓ 1. Fetch Staff & Constraints from DB
    ↓ 2. Create Roster (status: SOLVING)
    ↓ 3. Transform to Python API format
    ↓ 4. POST to Solver Engine
    ↓
Python Solver Engine (FastAPI + OR-Tools)
    ↓ Returns: { status: "OPTIMAL", schedule: {...} }
    ↓
SolverIntegrationService
    ↓ 5. Parse response
    ↓ 6. Create Shift records (transaction)
    ↓ 7. Update Roster (status: COMPLETED)
    ↓
PostgreSQL Database
```

**Key Files**:
- `/src/services/solver-integration.service.ts` - Main integration logic
- `/src/lib/validations/solver.ts` - Zod schemas for API validation
- `/src/app/actions/generate-roster.action.ts` - Next.js Server Actions
- `/scripts/test-solver-integration.ts` - Standalone test script
- `/prisma/schema.prisma` - Database models (Staff, Constraint, Roster, Shift)

**Constraint Format Examples**:

```typescript
// Point constraint: Alice must be off on Monday
{
  type: 'point',
  config: {
    resource: 'EMP001',
    time_slot: 0,
    state: 0
  }
}

// Vertical sum: Minimum 3 staff working each day
{
  type: 'vertical_sum',
  config: {
    time_slot: 'ALL',
    target_state: 1,
    operator: '>=',
    value: 3
  }
}
```

---

## 🐛 Troubleshooting

### Prisma Client Issues

If you see "Cannot read properties of undefined" errors:

```bash
# Regenerate Prisma Client
rm -rf node_modules/.prisma .next
npx prisma generate
npm run dev
```

### Database Connection Issues

```bash
# Test database connection
npx prisma db pull

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

---

## 📖 Documentation

- [Tech Stack Details](../docs/TECH_STACK.md)
- [Project Specifications](../specs/README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/new)
3. Add `DATABASE_URL` environment variable
4. Deploy

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm run start
```

---

**Last Updated**: 20 November 2025

# DB Command setup
# 0) Use the correct Node version
nvm use 22

# 1) Ensure DATABASE_URL is set
echo $DATABASE_URL

# 2) Remove existing migrations (dev-only reset)
rm -rf prisma/migrations

# 3) Clear Prisma Client cache to avoid stale schema issues
rm -rf node_modules/.prisma generated .next

# 4) Drop and recreate the database schema via Prisma
#    This will drop all data in the target database/schema
npx prisma migrate reset --force

# 5) Generate a fresh initial migration from the current schema and apply it
npx prisma migrate dev --name init

# 6) Generate Prisma Client (migrate dev usually does this, run to be sure)
npx prisma generate

# 7) Seed (uses your updated seed.ts; set RESET_SYSTEM_CONFIG=true to overwrite values)
RESET_SYSTEM_CONFIG=true npx prisma db seed

# Note: The seed file uses APN shift type (states: 0=Off, 1=Afternoon, 2=PM, 3=Night)
# Constraints are common rules applied to ALL staff, not per-employee specific