#!/usr/bin/env tsx
/**
 * Test script for Solver Integration Service
 * Tests the complete workflow: DB → Python API → DB
 *
 * Prerequisites:
 * 1. Database seeded with staff and constraints
 * 2. Python solver engine running on http://localhost:8000
 *
 * Run with: npx tsx scripts/test-solver-integration.ts
 */

import { SolverIntegrationService } from '../src/services/solver-integration.service';
import { prisma } from '../src/lib/prisma';
import { sortStaff } from '../src/lib/staff-sort';

async function testIntegration() {
  console.log('🧪 Testing Solver Integration Service\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Fetch test data
    console.log('\n📊 Step 1: Fetching test data from database...');

    const staffRaw = await prisma.staff.findMany({
      where: { isActive: true },
      include: { staffRoles: { include: { role: true } } },
      take: 5,
    });
    const staff = sortStaff(staffRaw);

    const constraints = await prisma.constraint.findMany({
      where: { isActive: true },
    });

    console.log(`   ✅ Found ${staff.length} active staff members`);
    console.log(`   ✅ Found ${constraints.length} active constraints`);

    if (staff.length === 0) {
      console.error('\n❌ Error: No staff found in database');
      console.log('   Run: npx prisma db seed');
      process.exit(1);
    }

    // Display staff
    console.log('\n   Staff:');
    staff.forEach((s) => {
      const roles = (s as any).staffRoles?.map((r: any) => r.role?.name).filter(Boolean) || [];
      const name = (s as any).user?.name || s.visibleId;
      console.log(
        `      - ${name} (${s.visibleId}) [${s.rank || 'N/A'} | ${roles.join(', ') || 'No Role'} | ${s.gender || 'N/A'}]`
      );
    });

    // Display constraints
    console.log('\n   Constraints:');
    constraints.forEach((c) => {
      console.log(`      - ${c.name} (${c.type})`);
    });

    // Step 2: Create roster
    console.log('\n🔧 Step 2: Creating roster and calling solver...');

    const service = new SolverIntegrationService();
    const startDate = new Date('2025-01-20');
    const timeSlots = 7; // 7 days

    console.log(`   Start Date: ${startDate.toISOString().split('T')[0]}`);
    console.log(`   Time Slots: ${timeSlots} days`);
    console.log(`   Solver URL: ${process.env.SOLVER_ENGINE_URL || 'http://localhost:8000'}`);

    const startTime = Date.now();

    const result = await service.generateRoster(
      'Test Week - ' + new Date().toISOString(),
      startDate,
      timeSlots,
      staff.map((s) => s.id),
      constraints.map((c) => c.id)
    );

    const duration = Date.now() - startTime;

    console.log(`\n✅ Step 3: Roster generated successfully!`);
    console.log(`   Roster ID: ${result.rosterId}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Duration: ${duration}ms`);

    // Step 4: Fetch and display results
    console.log('\n📋 Step 4: Fetching generated schedule...');

    const shifts = await prisma.shift.findMany({
      where: { rosterId: result.rosterId },
      include: { staff: { include: { user: true } } },
      orderBy: [{ staffId: 'asc' }, { timeSlot: 'asc' }],
    });

    console.log(`   ✅ Found ${shifts.length} shifts`);

    // Group by staff
    const shiftsByStaff = shifts.reduce(
      (acc, shift) => {
        const key = shift.staff.user?.name || shift.staff.visibleId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(shift.state);
        return acc;
      },
      {} as Record<string, number[]>
    );

    console.log('\n📅 Generated Schedule:');
    console.log('   ' + '─'.repeat(50));
    console.log('   Day:         ' + Array.from({ length: timeSlots }, (_, i) => i).join('  '));
    console.log('   ' + '─'.repeat(50));

    for (const [staffName, states] of Object.entries(shiftsByStaff)) {
      const stateDisplay = states.map((s) => (s === 0 ? '❌' : '✅')).join('  ');
      const paddedName = staffName.padEnd(12);
      console.log(`   ${paddedName} ${stateDisplay}`);
    }

    console.log('   ' + '─'.repeat(50));
    console.log('   Legend: ✅ = Working (1), ❌ = Off (0)');

    // Step 5: Verify constraints
    console.log('\n✔️  Step 5: Verifying constraints...');

    // Check Alice's constraint (if exists)
    const aliceConstraint = constraints.find((c) => c.name.includes('Alice'));
    if (aliceConstraint) {
      const aliceStaff = staff.find((s) => s.visibleId === 'EMP001');
      if (aliceStaff) {
        const aliceDay0 = shifts.find((s) => s.staffId === aliceStaff.id && s.timeSlot === 0);
        if (aliceDay0 && aliceDay0.state === 0) {
          console.log('   ✅ Alice is off on Monday (constraint satisfied)');
        } else {
          console.log('   ⚠️  Alice constraint may not be satisfied');
        }
      }
    }

    // Check minimum coverage
    const coverageConstraint = constraints.find((c) => c.type === 'vertical_sum');
    if (coverageConstraint) {
      const config = coverageConstraint.config as any;
      const minRequired = config.value;

      let allDaysCovered = true;
      for (let day = 0; day < timeSlots; day++) {
        const workingCount = shifts.filter((s) => s.timeSlot === day && s.state === 1).length;

        if (workingCount < minRequired) {
          console.log(`   ⚠️  Day ${day}: Only ${workingCount} working (need ${minRequired})`);
          allDaysCovered = false;
        }
      }

      if (allDaysCovered) {
        console.log(`   ✅ Minimum coverage constraint satisfied (≥${minRequired} staff each day)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Integration test completed successfully!\n');
    console.log('💡 View results in Prisma Studio: npx prisma studio');
    console.log('   Navigate to: Roster → Shifts\n');
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    console.error('\n💡 Make sure:');
    console.error('   1. PostgreSQL is running');
    console.error('   2. Database is seeded: npx prisma db seed');
    console.error(
      '   3. Python engine is running: cd engine && uv run uvicorn src.main:app --reload'
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testIntegration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
