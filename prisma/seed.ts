import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data (only if tables exist). Support both legacy PascalCase and new snake_case.
  try {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE shift CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE roster CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "_ConstraintToRoster" CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE constraint CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE staff_role CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE staff CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE staff_group CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE role CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE shift_definition CASCADE')
    console.log('✅ Cleared existing data')
  } catch (e) {
    console.log('⚠️  Tables may not exist yet, continuing...')
  }

  // Create Roles (FN/ADM/STF/007)
  const roleIC = await prisma.role.create({
    data: { name: 'IC', order: 1, isActive: true },
  })
  const roleRN = await prisma.role.create({
    data: { name: 'RN', order: 2, isActive: true },
  })
  console.log('✅ Created 2 roles (IC, RN)')

  // Create Shift Definitions (Updated for 24/7 12h coverage: Day & Night)
  // Day Shift: 07:00 – 19:00 (12h) => startMinutes = 7*60 = 420, durationMinutes = 720
  // Night Shift: 19:00 – 07:00 (12h crossing midnight) => startMinutes = 19*60 = 1140, durationMinutes = 720
  await prisma.shiftDefinition.createMany({
    data: [
      { code: 'D12', startMinutes: 420, durationMinutes: 720, isActive: true },   // 07:00-19:00 (12h Day)
      { code: 'N12', startMinutes: 1140, durationMinutes: 720, isActive: true },  // 19:00-07:00 (12h Night)
    ],
  })
  console.log('✅ Created 2 shift definitions (D12 Day, N12 Night)')

  // Create Staff for 24/7 June 2024 roster scenario (13 members)
  // Monthly target hours: 160–190 (13–16 shifts of 12h). Set min=160, max=190 for all.
  const staff = await Promise.all([
    prisma.staff.create({ data: { employeeId: 'EMP001', name: 'John', gender: 'M', monthlyMinHours: 160, monthlyMaxHours: 190 } }),
    prisma.staff.create({ data: { employeeId: 'EMP002', name: 'Emily', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } }),
    prisma.staff.create({ data: { employeeId: 'EMP003', name: 'Michael', gender: 'M', monthlyMinHours: 160, monthlyMaxHours: 190 } }),
    prisma.staff.create({ data: { employeeId: 'EMP004', name: 'Grace', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } }),
    prisma.staff.create({ data: { employeeId: 'EMP005', name: 'Dorothy', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } }),
    prisma.staff.create({ data: { employeeId: 'EMP006', name: 'Alan', gender: 'M', monthlyMinHours: 160, monthlyMaxHours: 190 } }),
    prisma.staff.create({ data: { employeeId: 'EMP007', name: 'Polly', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } }),
    prisma.staff.create({ data: { employeeId: 'EMP008', name: 'Pinky', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } }),
    prisma.staff.create({ data: { employeeId: 'EMP009', name: 'Joey', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } }),
    prisma.staff.create({ data: { employeeId: 'EMP010', name: 'Amy', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } }),
    prisma.staff.create({ data: { employeeId: 'EMP011', name: 'Sammi', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } }),
    prisma.staff.create({ data: { employeeId: 'EMP012', name: 'Janice', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } }),
    prisma.staff.create({ data: { employeeId: 'EMP013', name: 'Tracy', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } }),
  ])
  console.log(`✅ Created ${staff.length} staff members for scenario (IC + RN)`) 

  // Optional: Single staff group for all (simplify scenario)
  const masterGroup = await prisma.staffGroup.create({
    data: { name: '24/7 Operations Team', description: 'All staff for June 2024 roster' },
  })
  for (const s of staff) {
    await prisma.staff.update({ where: { id: s.id }, data: { staffGroupId: masterGroup.id } })
  }
  console.log('✅ Assigned all staff to master group')

  // Assign roles: First 8 are IC, remaining 5 are RN only
  const staffRoleData: { staffId: string; roleId: string }[] = []
  staff.slice(0, 8).forEach(s => staffRoleData.push({ staffId: s.id, roleId: roleIC.id }))
  staff.slice(8).forEach(s => staffRoleData.push({ staffId: s.id, roleId: roleRN.id }))
  await prisma.staffRole.createMany({ data: staffRoleData })
  console.log('✅ Assigned IC role to first 8 staff, RN role to remaining 5')

  // Advanced constraints for APN shift type
  // APN States: 0=Off, 1=Afternoon, 2=PM, 3=Night
  // Coverage: Afternoon >=3, PM >=3, Night ==2
  // Attribute coverage: At least 1 IC and 1 Female on each shift type
  // Common rules applied to ALL staff (not per-employee)
  const allTimeSlots = Array.from({ length: 30 }, (_, i) => i) // June 30 days

  const constraints = [] as any[]

  // ========== COVERAGE CONSTRAINTS ==========
  // Afternoon shift coverage (state 1)
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Afternoon Coverage >=3',
      type: 'vertical_sum',
      description: 'At least 3 staff on afternoon shift',
      config: { time_slot: 'ALL', target_state: 1, operator: '>=', value: 3 },
    },
  }))

  // PM shift coverage (state 2)
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'PM Coverage >=3',
      type: 'vertical_sum',
      description: 'At least 3 staff on PM shift',
      config: { time_slot: 'ALL', target_state: 2, operator: '>=', value: 3 },
    },
  }))

  // Night shift coverage (state 3)
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Night Coverage ==2',
      type: 'vertical_sum',
      description: 'Exactly 2 staff on night shift',
      config: { time_slot: 'ALL', target_state: 3, operator: '==', value: 2 },
    },
  }))

  // ========== ATTRIBUTE-BASED COVERAGE (IC Role) ==========
  // IC coverage for each shift type
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'IC Afternoon Coverage >=1',
      type: 'attribute_vertical_sum',
      description: 'At least one IC on each afternoon shift',
      config: { time_slot: 'ALL', target_state: 1, operator: '>=', value: 1, attribute: 'roles', attribute_values: ['IC'] },
    },
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'IC PM Coverage >=1',
      type: 'attribute_vertical_sum',
      description: 'At least one IC on each PM shift',
      config: { time_slot: 'ALL', target_state: 2, operator: '>=', value: 1, attribute: 'roles', attribute_values: ['IC'] },
    },
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'IC Night Coverage >=1',
      type: 'attribute_vertical_sum',
      description: 'At least one IC on each night shift',
      config: { time_slot: 'ALL', target_state: 3, operator: '>=', value: 1, attribute: 'roles', attribute_values: ['IC'] },
    },
  }))

  // ========== ATTRIBUTE-BASED COVERAGE (Gender) ==========
  // Female coverage for each shift type
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Female Afternoon Coverage >=1',
      type: 'attribute_vertical_sum',
      description: 'At least one female on each afternoon shift',
      config: { time_slot: 'ALL', target_state: 1, operator: '>=', value: 1, attribute: 'gender', attribute_values: ['F'] },
    },
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Female PM Coverage >=1',
      type: 'attribute_vertical_sum',
      description: 'At least one female on each PM shift',
      config: { time_slot: 'ALL', target_state: 2, operator: '>=', value: 1, attribute: 'gender', attribute_values: ['F'] },
    },
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Female Night Coverage >=1',
      type: 'attribute_vertical_sum',
      description: 'At least one female on each night shift',
      config: { time_slot: 'ALL', target_state: 3, operator: '>=', value: 1, attribute: 'gender', attribute_values: ['F'] },
    },
  }))

  // ========== PATTERN BLOCKS (Common Safety Rules) ==========
  // Block dangerous shift transitions
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Block NIGHT→AFTERNOON Transition',
      type: 'pattern_block',
      description: 'Prevent immediate night then afternoon shift next day',
      config: { pattern: ['NIGHT', 'AFTERNOON'], state_mapping: { NIGHT: 3, AFTERNOON: 1, PM: 2, OFF: 0 } },
    }
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Block NIGHT→PM Transition',
      type: 'pattern_block',
      description: 'Prevent immediate night then PM shift next day',
      config: { pattern: ['NIGHT', 'PM'], state_mapping: { NIGHT: 3, AFTERNOON: 1, PM: 2, OFF: 0 } },
    }
  }))

  console.log(`✅ Created ${constraints.length} advanced constraints for June roster scenario`) 

  // --------------------------------------------------------------------------
  // System Configuration (GLOBAL + ROSTER) – upsert without destructive truncate
  // --------------------------------------------------------------------------
  const RESET_SYSTEM_CONFIG = process.env.RESET_SYSTEM_CONFIG === 'true'

  // Upsert groups by stable code
  const coreGlobal = await prisma.systemConfigGroup.upsert({
    where: { code: 'core_global' },
    update: {},
    create: {
      code: 'core_global',
      name: 'Global Policies',
      scope: 'GLOBAL',
      isActive: true,
      locked: true,
    },
  })

  const rosterMgmt = await prisma.systemConfigGroup.upsert({
    where: { code: 'roster_management' },
    update: {},
    create: {
      code: 'roster_management',
      name: 'Roster Management Policies',
      scope: 'ROSTER',
      isActive: true,
      locked: false,
    },
  })

  // Helper to upsert item with composite unique (groupId, key)
  async function upsertItem(groupId: number, key: string, data: {
    label: string
    type: string
    value: unknown
    priority?: number
    isActive?: boolean
    locked?: boolean
  }) {
    // Try find existing
    const existing = await prisma.systemConfigItem.findUnique({
      where: { groupId_key: { groupId, key } },
    })
    if (!existing) {
      await prisma.systemConfigItem.create({
        data: {
          groupId,
          key,
          label: data.label,
          type: data.type,
          value: data.value as any,
          priority: data.priority ?? 0,
          isActive: data.isActive ?? true,
          locked: data.locked ?? false,
        },
      })
      return 'created'
    }
    if (RESET_SYSTEM_CONFIG) {
      await prisma.systemConfigItem.update({
        where: { id: existing.id },
        data: {
          label: data.label,
          type: data.type,
          value: data.value as any,
          priority: data.priority ?? existing.priority,
          isActive: data.isActive ?? existing.isActive,
          locked: data.locked ?? existing.locked,
        },
      })
      return 'updated'
    }
    return 'skipped'
  }

  // Seed GLOBAL items (locked)
  await upsertItem(coreGlobal.id, 'max_consecutive_nights', {
    label: 'Max Consecutive Night Shifts',
    type: 'nurse_safety',
    value: { limit: 3 },
    locked: true,
  })
  await upsertItem(coreGlobal.id, 'night_to_day_block', {
    label: 'Block Night→Day Immediate Transition',
    type: 'nurse_safety',
    value: { enabled: true },
    locked: true,
  })

  // Seed ROSTER items (editable)
  await upsertItem(rosterMgmt.id, 'min_daily_coverage', {
    label: 'Minimum Daily Coverage',
    type: 'coverage',
    value: { min: 3, target_state: 1 },
    locked: false,
  })

  console.log('✅ Seeded system configuration groups and items (upserted)')

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
