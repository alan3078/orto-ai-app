# Testing Guide - Roster Generation Integration

This guide shows you how to test the complete integration between Next.js and the Python solver engine.

---

## Quick Start

### 1. Prerequisites

Make sure you have:
- ✅ PostgreSQL running on localhost:5432
- ✅ Database seeded with test data
- ✅ Python solver engine running

### 2. Setup Steps

```bash
# Terminal 1: Start Python Solver Engine
cd engine
uv run uvicorn src.main:app --reload

# You should see:
# INFO:     Uvicorn running on http://127.0.0.1:8000

# Terminal 2: Seed Database (if not done already)
cd web
npx prisma db seed

# You should see:
# ✅ Seeded 5 staff members
# ✅ Seeded 2 constraints

# Terminal 3: Start Next.js Dev Server
cd web
npm run dev

# Visit: http://localhost:3000
```

---

## Testing Options

You have **3 ways** to test the integration:

### Option 1: Web UI (Recommended for Demo) ✨

**Best for**: Visual demonstration and user testing

1. Open http://localhost:3000
2. Click "Test Roster Generation 🚀"
3. Fill in the form:
   - Roster Name: "Week of 2025-01-20"
   - Start Date: 2025-01-20
   - Number of Days: 7
4. Click "Generate Schedule"
5. View the generated roster with visual schedule grid

**What you'll see**:
- ✅ List of recent rosters with status badges
- ✅ Detailed schedule view with color-coded shifts
- ✅ Working (green ✓) vs Off (gray ✕) visualization
- ✅ Constraints applied section
- ✅ Solver timing information

---

### Option 2: Standalone Script (Recommended for Testing) 🧪

**Best for**: Backend testing without UI, CI/CD

```bash
cd web
npx tsx scripts/test-solver-integration.ts
```

**What it does**:
1. Fetches staff and constraints from database
2. Calls `SolverIntegrationService.generateRoster()`
3. Displays results in terminal with ASCII visualization
4. Verifies constraint satisfaction

**Expected Output**:
```
🧪 Testing Solver Integration Service
============================================================

📊 Step 1: Fetching test data from database...
   ✅ Found 5 active staff members
   ✅ Found 2 active constraints

   Staff:
      - Alice (EMP001)
      - Bob (EMP002)
      - Charlie (EMP003)
      - Diana (EMP004)
      - Eve (EMP005)

   Constraints:
      - Alice off on Monday (point)
      - Minimum 3 staff per day (vertical_sum)

🔧 Step 2: Creating roster and calling solver...
   Start Date: 2025-01-20
   Time Slots: 7 days
   Solver URL: http://localhost:8000

✅ Step 3: Roster generated successfully!
   Roster ID: cm3r8x9y20000...
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
   Charlie      ✅  ✅  ✅  ❌  ✅  ✅  ✅
   Diana        ✅  ❌  ✅  ✅  ✅  ✅  ❌
   Eve          ✅  ✅  ✅  ✅  ❌  ✅  ✅
   ──────────────────────────────────────────────────
   Legend: ✅ = Working (1), ❌ = Off (0)

✔️  Step 5: Verifying constraints...
   ✅ Alice is off on Monday (constraint satisfied)
   ✅ Minimum coverage constraint satisfied (≥3 staff each day)

🎉 Integration test completed successfully!

💡 View results in Prisma Studio: npx prisma studio
```

---

### Option 3: Direct Server Action Call (Advanced) 🔧

**Best for**: React component integration

Create a test component:

```typescript
'use client'

import { generateRosterAction } from '@/app/actions/generate-roster.action'
import { useFormState } from 'react-dom'
import { Button } from '@/components/ui/button'

export function RosterGeneratorForm() {
  const [state, formAction] = useFormState(generateRosterAction, null)

  return (
    <form action={formAction}>
      <input type="text" name="name" defaultValue="Test Roster" required />
      <input type="date" name="startDate" defaultValue="2025-01-20" required />
      <input type="number" name="timeSlots" defaultValue="7" required />
      <Button type="submit">Generate</Button>
    </form>
  )
}
```

---

## What Gets Tested

### 1. Database Layer
- ✅ Fetching active staff from `Staff` table
- ✅ Fetching active constraints from `Constraint` table
- ✅ Creating `Roster` record with SOLVING status
- ✅ Creating multiple `Shift` records in transaction
- ✅ Updating roster status to COMPLETED

### 2. Integration Service
- ✅ Data transformation: Prisma models → Python API format
- ✅ HTTP POST to Python engine
- ✅ Response validation with Zod schemas
- ✅ Error handling for network failures
- ✅ Transaction rollback on errors

### 3. Solver Engine
- ✅ Constraint satisfaction (point constraints)
- ✅ Coverage requirements (vertical_sum constraints)
- ✅ Optimal solution generation
- ✅ INFEASIBLE scenario handling

### 4. End-to-End Flow
```
User Form Submit
    ↓
Server Action (generateRosterAction)
    ↓
Integration Service (SolverIntegrationService)
    ↓
Database Query (fetch staff & constraints)
    ↓
Data Transform (buildSolverRequest)
    ↓
HTTP POST (callSolverApi)
    ↓
Python Solver Engine (OR-Tools)
    ↓
Response Parsing (saveSolverResults)
    ↓
Database Transaction (create shifts)
    ↓
Cache Revalidation
    ↓
Redirect to Detail Page
```

---

## Verify Results

### Using Prisma Studio (Visual)

```bash
cd web
npx prisma studio
```

Navigate to:
1. **Roster** table → Check status = "COMPLETED"
2. **Shift** table → Should have 35 records (5 staff × 7 days)
3. Filter shifts by rosterId to see one roster's data

### Using SQL (Advanced)

```sql
-- Get latest roster
SELECT * FROM "Roster" ORDER BY "createdAt" DESC LIMIT 1;

-- Get shifts for a roster
SELECT s.*, st.name as staff_name
FROM "Shift" s
JOIN "Staff" st ON s."staffId" = st.id
WHERE s."rosterId" = 'YOUR_ROSTER_ID'
ORDER BY st.name, s."timeSlot";

-- Verify Alice is off on Monday (timeSlot = 0, state = 0)
SELECT s.*, st.name
FROM "Shift" s
JOIN "Staff" st ON s."staffId" = st.id
WHERE st."employeeId" = 'EMP001' AND s."timeSlot" = 0;
```

---

## Testing Scenarios

### Scenario 1: Happy Path ✅

**Goal**: Generate valid schedule with satisfied constraints

```bash
# Run test script
npx tsx scripts/test-solver-integration.ts

# Expected: status = COMPLETED, 35 shifts created
```

---

### Scenario 2: INFEASIBLE Constraints ⚠️

**Goal**: Test when no valid solution exists

1. Add conflicting constraints to seed:
```typescript
// In prisma/seed.ts, add:
await prisma.constraint.create({
  data: {
    name: 'Alice must work Monday',
    type: 'point',
    config: {
      resource: 'EMP001',
      time_slot: 0,
      state: 1, // CONFLICT: Alice already has off on Monday
    },
    isActive: true,
  },
})
```

2. Re-seed and test:
```bash
npx prisma db seed
npx tsx scripts/test-solver-integration.ts
```

**Expected**: status = INFEASIBLE, no shifts created

---

### Scenario 3: Solver Engine Down ❌

**Goal**: Test error handling

1. Stop Python engine (Ctrl+C in Terminal 1)
2. Run test:
```bash
npx tsx scripts/test-solver-integration.ts
```

**Expected**: Error message about connection refused, roster status = FAILED

---

### Scenario 4: No Staff in Database 🚫

**Goal**: Test validation

1. Clear staff table:
```bash
npx prisma studio
# Delete all staff records
```

2. Run test:
```bash
npx tsx scripts/test-solver-integration.ts
```

**Expected**: Error "No active staff members found"

---

## Troubleshooting

### Issue: "Property 'staff' does not exist on PrismaClient"

**Solution**: Regenerate Prisma Client
```bash
cd web
npx prisma generate
# Restart TypeScript server in VS Code: Cmd+Shift+P → "Restart TypeScript Server"
```

---

### Issue: "fetch failed" or "ECONNREFUSED"

**Solution**: Python engine not running
```bash
# Terminal 1:
cd engine
uv run uvicorn src.main:app --reload

# Verify it's running:
curl http://localhost:8000/api/v1/solve/health
```

---

### Issue: "No active staff members found"

**Solution**: Database not seeded
```bash
cd web
npx prisma db seed
```

---

### Issue: Form submits but nothing happens

**Solution**: Check browser console and server logs
```bash
# In browser: Open DevTools → Console
# In terminal: Check Next.js server output for errors
```

---

## Performance Benchmarks

Expected performance metrics:

| Operation | Expected Time |
|-----------|---------------|
| Database fetch (staff + constraints) | < 50ms |
| Build solver request | < 10ms |
| HTTP POST to Python engine | 100-300ms |
| Solver computation (7 days, 5 staff) | 50-200ms |
| Save results to database | < 100ms |
| **Total end-to-end** | **300-500ms** |

If you see much longer times:
- Check database connection pooling
- Verify Python engine is running locally (not remote)
- Check for network latency issues

---

## Next Steps

After successful testing:

1. **Build Admin UI** for managing staff and constraints
2. **Add Authentication** with NextAuth.js
3. **Create Schedule Viewer** for displaying rosters
4. **Implement Real-time Updates** with WebSockets
5. **Add Export Features** (PDF, CSV)

---

## API Reference

### Server Actions

#### `generateRosterAction(formData: FormData)`

Generates a new roster by calling the solver engine.

**FormData fields**:
- `name` (string): Roster name
- `startDate` (string): ISO date string
- `timeSlots` (string): Number of days (1-31)

**Returns**: Redirects to roster detail page on success

---

#### `getRostersAction()`

Fetches all rosters ordered by creation date.

**Returns**: `{ success: boolean, rosters?: Roster[], error?: string }`

---

#### `getRosterByIdAction(rosterId: string)`

Fetches a specific roster with all shifts and constraints.

**Returns**: `{ success: boolean, roster?: Roster, error?: string }`

---

## Files Reference

| File | Purpose |
|------|---------|
| `/web/src/services/solver-integration.service.ts` | Core integration logic |
| `/web/src/app/actions/generate-roster.action.ts` | Next.js Server Actions |
| `/web/src/lib/validations/solver.ts` | Zod validation schemas |
| `/web/scripts/test-solver-integration.ts` | Standalone test script |
| `/web/src/app/test-roster/page.tsx` | Web UI for testing |
| `/web/src/app/test-roster/[id]/page.tsx` | Roster detail view |
| `/web/prisma/schema.prisma` | Database models |
| `/web/prisma/seed.ts` | Test data seeding |

---

**Happy Testing! 🎉**
