import { PrismaClient } from '@prisma/client'
import type { Prisma, Constraint, ShiftType } from '@prisma/client'
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
    await prisma.$executeRawUnsafe('TRUNCATE TABLE shift_type_config CASCADE')
    console.log('✅ Cleared existing data')
  } catch (e) {
    console.log('⚠️  Tables may not exist yet, continuing...')
  }

  // Create Shift Type Configurations (common config for each shift type)
  await prisma.shiftTypeConfig.upsert({
    where: { shiftType: 'APN' },
    update: {},
    create: {
      shiftType: 'APN',
      name: 'APN Shift',
      description: 'Afternoon, PM, Night shift pattern (0=Off, 1=A, 2=P, 3=N)',
      minHoursPerMonth: 160,
      maxHoursPerMonth: 190,
      isActive: true,
    },
  })
  await prisma.shiftTypeConfig.upsert({
    where: { shiftType: 'SEVEN_E' },
    update: {},
    create: {
      shiftType: 'SEVEN_E',
      name: '7E Shift',
      description: '7E shift pattern: 7=Day (0700-1900, 12h), E=Night (1900-0700, 12h)',
      minHoursPerMonth: 160,
      maxHoursPerMonth: 190,
      isActive: true,
    },
  })
  console.log('✅ Created shift type configurations (APN, 7E)')

  // Create Roles (FN/ADM/STF/007)
  const roleIC = await prisma.role.create({
    data: { name: 'IC', order: 1, isActive: true },
  })
  const roleNonIC = await prisma.role.create({
    data: { name: 'Non-IC', order: 2, isActive: true },
  })
  console.log('✅ Created 2 roles (IC, Non-IC)')

  // Create Shift Definitions
  // 7E Pattern (12h shifts):
  //   7 = Day Shift: 07:00 – 19:00 (12h) => startMinutes = 7*60 = 420, durationMinutes = 720
  //   E = Night Shift: 19:00 – 07:00 (12h) => startMinutes = 19*60 = 1140, durationMinutes = 720
  // APN Pattern (8.5h shifts):
  //   A = Afternoon: 07:00 – 15:30 (8.5h) => startMinutes = 420, durationMinutes = 510
  //   P = PM: 14:30 – 23:00 (8.5h) => startMinutes = 870, durationMinutes = 510
  //   N = Night: 22:30 – 07:00 (8.5h) => startMinutes = 1350, durationMinutes = 510
  await prisma.shiftDefinition.createMany({
    data: [
      // 7E Pattern (12h shifts)
      { code: '7', startMinutes: 420, durationMinutes: 720, isActive: true },   // 07:00-19:00 (12h Day)
      { code: 'E', startMinutes: 1140, durationMinutes: 720, isActive: true },  // 19:00-07:00 (12h Night)
      // APN Pattern (8.5h shifts)
      { code: 'A', startMinutes: 420, durationMinutes: 510, isActive: true },   // 07:00-15:30 (8.5h Afternoon)
      { code: 'P', startMinutes: 870, durationMinutes: 510, isActive: true },   // 14:30-23:00 (8.5h PM)
      { code: 'N', startMinutes: 1350, durationMinutes: 510, isActive: true },  // 22:30-07:00 (8.5h Night)
    ],
  })
  console.log('✅ Created 5 shift definitions (7, E for 7E; A, P, N for APN)')

  // Create Staff for ICU/HDU Nurses Duty roster (from Hong Kong Adventist Hospital)
  // Based on February 2025 roster: 16 nurses with ranks
  // IC role: Tse Chi Ming to Lala Chau (first 10)
  // RN role: Sammi Ho to Anita Tsui (last 6)
  const staff = await Promise.all([
    // IC Role Staff (Tse Chi Ming to Lala Chau)
    prisma.staff.create({ data: { employeeId: 'EMP001', name: 'Tse Chi Ming', rank: 'SNO', gender: 'M', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    prisma.staff.create({ data: { employeeId: 'EMP002', name: 'Yu Siu Fai', rank: 'SRN', gender: 'M', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    prisma.staff.create({ data: { employeeId: 'EMP003', name: 'Yau Siu Bun', rank: 'SRN', gender: 'M', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    prisma.staff.create({ data: { employeeId: 'EMP004', name: 'Jasmin Kwan', rank: 'RN', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    prisma.staff.create({ data: { employeeId: 'EMP005', name: 'Mak Pui Han', rank: 'RN', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    prisma.staff.create({ data: { employeeId: 'EMP006', name: 'Reika Pang', rank: 'RN', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    prisma.staff.create({ data: { employeeId: 'EMP007', name: 'Perry Chong', rank: 'RN', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    prisma.staff.create({ data: { employeeId: 'EMP008', name: 'Joey Wong', rank: 'RN', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    prisma.staff.create({ data: { employeeId: 'EMP009', name: 'Lala Chau', rank: 'RN', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    // RN Role Staff (Sammi Ho to Anita Tsui)
    prisma.staff.create({ data: { employeeId: 'EMP010', name: 'Sammi Ho', rank: 'RN', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    prisma.staff.create({ data: { employeeId: 'EMP011', name: 'Ivy Ip', rank: 'RN', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    prisma.staff.create({ data: { employeeId: 'EMP012', name: 'Janice Shum', rank: 'RN', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    prisma.staff.create({ data: { employeeId: 'EMP013', name: 'Cindy Ng', rank: 'RN', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    prisma.staff.create({ data: { employeeId: 'EMP014', name: 'Judy Chan', rank: 'RN', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
    prisma.staff.create({ data: { employeeId: 'EMP015', name: 'Anita Tsui', rank: 'RN-CW', gender: 'F', monthlyMinHours: 160, monthlyMaxHours: 190 } as any }),
  ])
  console.log(`✅ Created ${staff.length} staff members (ICU/HDU nurses)`) 

  // Optional: Single staff group for all (simplify scenario)
  const masterGroup = await prisma.staffGroup.create({
    data: { name: 'ICU/HDU Team', description: 'ICU/HDU Nurses - Hong Kong Adventist Hospital Tsuen Wan' },
  })
  for (const s of staff) {
    await prisma.staff.update({ where: { id: s.id }, data: { staffGroupId: masterGroup.id } })
  }
  console.log('✅ Assigned all staff to ICU/HDU team')

  // Assign roles: First 9 are IC (Tse Chi Ming to Lala Chau), remaining 6 are Non-IC
  const staffRoleData: { staffId: string; roleId: string }[] = []
  staff.slice(0, 9).forEach(s => staffRoleData.push({ staffId: s.id, roleId: roleIC.id }))
  staff.slice(9).forEach(s => staffRoleData.push({ staffId: s.id, roleId: roleNonIC.id }))
  await prisma.staffRole.createMany({ data: staffRoleData })
  console.log('✅ Assigned IC role to first 9 staff (Tse Chi Ming to Lala Chau), Non-IC role to remaining 6')

  // Advanced constraints for APN shift type
  // APN States: 0=Off, 1=Afternoon, 2=PM, 3=Night
  // Coverage: Afternoon =4, PM =4, Night =2 (daily requirement)
  // Attribute coverage: At least 1 IC and 1 Female on each shift type
  // Common rules applied to ALL staff (not per-employee)
  const allTimeSlots = Array.from({ length: 30 }, (_, i) => i) // June 30 days

  const constraints: Constraint[] = []

  // ========== COVERAGE CONSTRAINTS (APN-specific) ==========
  // Afternoon shift coverage (state 1) - exactly 4 per day
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Afternoon Coverage ==4',
      type: 'vertical_sum',
      description: 'Exactly 4 staff on afternoon shift',
      config: { time_slot: 'ALL', target_state: 1, operator: '==', value: 4 },
      shiftType: 'APN',
    } as any,
  }))

  // PM shift coverage (state 2) - exactly 4 per day
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'PM Coverage ==4',
      type: 'vertical_sum',
      description: 'Exactly 4 staff on PM shift',
      config: { time_slot: 'ALL', target_state: 2, operator: '==', value: 4 },
      shiftType: 'APN',
    } as any,
  }))

  // Night shift coverage (state 3)
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Night Coverage ==2',
      type: 'vertical_sum',
      description: 'Exactly 2 staff on night shift',
      config: { time_slot: 'ALL', target_state: 3, operator: '==', value: 2 },
      shiftType: 'APN',
    } as any,
  }))

  // ========== ATTRIBUTE-BASED COVERAGE (IC Role) - APN-specific ==========
  // IC coverage for each shift type
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'IC Afternoon Coverage >=1',
      type: 'attribute_vertical_sum',
      description: 'At least one IC on each afternoon shift',
      config: { time_slot: 'ALL', target_state: 1, operator: '>=', value: 1, attribute: 'roles', attribute_values: ['IC'] },
      shiftType: 'APN',
    } as any,
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'IC PM Coverage >=1',
      type: 'attribute_vertical_sum',
      description: 'At least one IC on each PM shift',
      config: { time_slot: 'ALL', target_state: 2, operator: '>=', value: 1, attribute: 'roles', attribute_values: ['IC'] },
      shiftType: 'APN',
    } as any,
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'IC Night Coverage >=1',
      type: 'attribute_vertical_sum',
      description: 'At least one IC on each night shift',
      config: { time_slot: 'ALL', target_state: 3, operator: '>=', value: 1, attribute: 'roles', attribute_values: ['IC'] },
      shiftType: 'APN',
    } as any,
  }))

  // ========== ATTRIBUTE-BASED COVERAGE (Gender) - APN-specific ==========
  // Female coverage for each shift type
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Female Afternoon Coverage >=1',
      type: 'attribute_vertical_sum',
      description: 'At least one female on each afternoon shift',
      config: { time_slot: 'ALL', target_state: 1, operator: '>=', value: 1, attribute: 'gender', attribute_values: ['F'] },
      shiftType: 'APN',
    } as any,
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Female PM Coverage >=1',
      type: 'attribute_vertical_sum',
      description: 'At least one female on each PM shift',
      config: { time_slot: 'ALL', target_state: 2, operator: '>=', value: 1, attribute: 'gender', attribute_values: ['F'] },
      shiftType: 'APN',
    } as any,
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Female Night Coverage >=1',
      type: 'attribute_vertical_sum',
      description: 'At least one female on each night shift',
      config: { time_slot: 'ALL', target_state: 3, operator: '>=', value: 1, attribute: 'gender', attribute_values: ['F'] },
      shiftType: 'APN',
    } as any,
  }))

  // ========== PATTERN BLOCKS (APN-specific Safety Rules) ==========
  // Block dangerous shift transitions
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Block NIGHT→AFTERNOON Transition',
      type: 'pattern_block',
      description: 'Prevent immediate night then afternoon shift next day',
      config: { pattern: ['NIGHT', 'AFTERNOON'], state_mapping: { NIGHT: 3, AFTERNOON: 1, PM: 2, OFF: 0 } },
      shiftType: 'APN',
    } as any
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Block NIGHT→PM Transition',
      type: 'pattern_block',
      description: 'Prevent immediate night then PM shift next day',
      config: { pattern: ['NIGHT', 'PM'], state_mapping: { NIGHT: 3, AFTERNOON: 1, PM: 2, OFF: 0 } },
      shiftType: 'APN',
    } as any
  }))

  // ==========================================================================
  // 7E MODE CONSTRAINTS (FN/ADM/RUL/003 - 7E Staffing)
  // ==========================================================================
  // 7E States: 0=Off, 1=Day (7), 2=Night (E)
  // Coverage: Day >=3, Night >=2
  // Compound coverage: Female IC >= 1 on each shift type
  // Pattern blocks: Night→Day transition forbidden

  // ========== COVERAGE CONSTRAINTS (7E-specific) ==========
  // Day shift coverage (state 1) - minimum 3 staff
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Day Coverage >=3',
      type: 'vertical_sum',
      description: 'At least 3 staff on day shift (7)',
      config: { time_slot: 'ALL', target_state: 1, operator: '>=', value: 3 },
      shiftType: 'SEVEN_E',
    } as any,
  }))

  // Night shift coverage (state 2) - minimum 2 staff
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Night Coverage >=2',
      type: 'vertical_sum',
      description: 'At least 2 staff on night shift (E)',
      config: { time_slot: 'ALL', target_state: 2, operator: '>=', value: 2 },
      shiftType: 'SEVEN_E',
    } as any,
  }))

  // ========== COMPOUND ATTRIBUTE CONSTRAINTS (Female IC) - 7E-specific ==========
  // Female IC coverage for Day shift - requires compound filter (gender=F AND role=IC)
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Female IC Day Coverage >=1',
      type: 'compound_attribute_vertical_sum',
      description: 'At least one female IC on each day shift',
      config: { 
        time_slot: 'ALL', 
        target_state: 1, 
        operator: '>=', 
        value: 1, 
        attribute_filters: { gender: ['F'], roles: ['IC'] }
      },
      shiftType: 'SEVEN_E',
    } as any,
  }))

  // Female IC coverage for Night shift - requires compound filter (gender=F AND role=IC)
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Female IC Night Coverage >=1',
      type: 'compound_attribute_vertical_sum',
      description: 'At least one female IC on each night shift',
      config: { 
        time_slot: 'ALL', 
        target_state: 2, 
        operator: '>=', 
        value: 1, 
        attribute_filters: { gender: ['F'], roles: ['IC'] }
      },
      shiftType: 'SEVEN_E',
    } as any,
  }))

  // ========== PATTERN BLOCKS (7E-specific Safety Rules) ==========
  // Block dangerous Night→Day transition (prevents fatigue)
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Block NIGHT→DAY Transition',
      type: 'pattern_block',
      description: 'Prevent immediate night then day shift next day (fatigue risk)',
      config: { pattern: ['NIGHT', 'DAY'], state_mapping: { NIGHT: 2, DAY: 1, OFF: 0 } },
      shiftType: 'SEVEN_E',
    } as any
  }))

  // ========== MAX CONSECUTIVE WORK DAYS (7E-specific) ==========
  // Max 5 consecutive work days for any staff (applies to both day and night states)
  // This is enforced per-resource but as a template for solver integration
  // Note: This creates a horizontal_sum constraint for each staff member
  // For now we add a representative constraint - actual enforcement needs per-staff expansion
  
  console.log(`✅ Created ${constraints.length} constraints (APN + 7E modes)`) 

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
    value: Prisma.InputJsonValue
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
    value: {
      limit: 3,
      target_state: 3, // APN night state
      time_slots: Array.from({ length: 30 }, (_, i) => i),
    },
    locked: true,
  })
  await upsertItem(coreGlobal.id, 'night_to_day_block', {
    label: 'Block Night→Day Immediate Transition',
    type: 'nurse_safety',
    value: { enabled: true },
    locked: true,
  })

  // Rule #7: Post-night rest - 2 days off after ANY night shift
  // Business rule: After finishing a night shift, must have at least 2 full days off
  // before returning to any shift (day or night)
  await upsertItem(coreGlobal.id, 'post_night_rest', {
    label: 'Post-Night Rest (2 Days Off After Night Shift)',
    type: 'nurse_safety',
    value: {
      enabled: true,
      work_days: 1,     // After 1 night shift...
      rest_days: 2,     // ...require 2 days rest before next work
      target_state: 2,  // 7E night state (E=2); will fallback for APN
      time_slots: Array.from({ length: 30 }, (_, i) => i),
    },
    locked: true,
  })

  // Rule #5: Night shift distribution - 3 to 7 nights per person per month
  // With 13 staff, 2 per night × 30 days = 60 nights total / 13 = ~4.6 avg
  // Allow range 3-7 for flexibility with coverage constraints
  // NOTE: target_state is for 7E mode (E=2). Mapper will fallback for APN (N=3).
  await upsertItem(coreGlobal.id, 'night_distribution', {
    label: 'Night Distribution (3-7 per Person)',
    type: 'fairness',
    value: {
      enabled: true,
      min_nights: 3,
      max_nights: 7,
      target_state: 2,  // 7E night state (E=2); mapper will fallback for APN
      time_slots: Array.from({ length: 30 }, (_, i) => i),
    },
    locked: false,
  })

  // NOTE: Total shift cap is now dynamically derived from shift_type_config + shift_definition
  // The min/max hours per month from ShiftTypeConfig is used with the average shift duration
  // to calculate the allowed number of shifts per staff member.

  // Seed ROSTER items (editable)
  await upsertItem(rosterMgmt.id, 'min_daily_coverage', {
    label: 'Minimum Daily Coverage',
    type: 'coverage',
    value: { min: 3, target_state: 1 },
    locked: false,
  })

  // 7E specific system config items
  await upsertItem(coreGlobal.id, 'seven_e_day_coverage', {
    label: 'Day Shift Minimum Coverage (7E)',
    type: 'coverage',
    value: { 
      enabled: true,
      min: 3, 
      target_state: 1,
      shift_type: 'SEVEN_E',
    },
    locked: false,
  })

  await upsertItem(coreGlobal.id, 'seven_e_night_coverage', {
    label: 'Night Shift Minimum Coverage (7E)',
    type: 'coverage',
    value: { 
      enabled: true,
      min: 2, 
      target_state: 2,
      shift_type: 'SEVEN_E',
    },
    locked: false,
  })

  await upsertItem(coreGlobal.id, 'seven_e_female_ic_day', {
    label: 'Female IC Day Coverage (7E)',
    type: 'compound_coverage',
    value: { 
      enabled: true,
      min: 1, 
      target_state: 1,
      attribute_filters: { gender: ['F'], roles: ['IC'] },
      shift_type: 'SEVEN_E',
    },
    locked: false,
  })

  await upsertItem(coreGlobal.id, 'seven_e_female_ic_night', {
    label: 'Female IC Night Coverage (7E)',
    type: 'compound_coverage',
    value: { 
      enabled: true,
      min: 1, 
      target_state: 2,
      attribute_filters: { gender: ['F'], roles: ['IC'] },
      shift_type: 'SEVEN_E',
    },
    locked: false,
  })

  await upsertItem(coreGlobal.id, 'seven_e_block_transition', {
    label: 'Block Night→Day Transition (7E)',
    type: 'nurse_safety',
    value: { 
      enabled: true,
      pattern: ['NIGHT', 'DAY'],
      state_mapping: { NIGHT: 2, DAY: 1, OFF: 0 },
      shift_type: 'SEVEN_E',
    },
    locked: true,
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
