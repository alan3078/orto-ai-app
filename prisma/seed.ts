import { PrismaClient, UserRole } from '@prisma/client'
import type { Prisma, Constraint, ShiftType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { hash } from 'bcryptjs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Helper to create User + Staff together (1:1 relationship)
async function createUserWithStaff(data: {
  username: string
  email?: string
  name: string
  password: string
  role: UserRole
  visibleId: string
  rank?: string
  gender?: 'M' | 'F'
}) {
  const passwordHash = await hash(data.password, 12)
  
  const user = await prisma.user.create({
    data: {
      username: data.username,
      email: data.email || null,
      name: data.name,
      passwordHash,
      role: data.role,
      isActive: true,
      mustResetPassword: data.role === UserRole.USER, // Users must reset, admins don't for convenience
      staff: {
        create: {
          visibleId: data.visibleId,
          rank: data.rank,
          gender: data.gender,
          isActive: true,
        },
      },
    },
    include: { staff: true },
  })
  
  return user
}

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data (only if tables exist). Support both legacy PascalCase and new snake_case.
  try {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE shift CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE roster CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "_ConstraintToRoster" CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE constraint CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE leave CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE public_holiday CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE staff_role CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE staff CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE staff_group CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE role CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE shift_definition CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE shift_type_config CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "user" CASCADE')
    console.log('✅ Cleared existing data')
  } catch (e) {
    console.log('⚠️  Tables may not exist yet, continuing...')
  }

  // ============================================================================
  // Create Default Admin User (FN/ADM/AUTH/001)
  // Admin has no Staff record (system admin, not a nurse)
  // ============================================================================
  const adminUsername = 'admin'
  const adminPassword = 'password'
  const adminPasswordHash = await hash(adminPassword, 12)
  
  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      email: null,
      name: 'System Administrator',
      passwordHash: adminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      mustResetPassword: false, // Set to false for initial setup convenience
    },
  })
  console.log(`✅ Created default super admin user: ${adminUsername} / ${adminPassword}`)

  // ============================================================================
  // Create Permission Modules and Permissions (FN/ADM/AUTH/002)
  // ============================================================================
  
  // Clear existing permissions
  try {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE role_permission CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE permission CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE permission_module CASCADE')
  } catch (e) {
    console.log('⚠️  Permission tables may not exist yet, continuing...')
  }

  // Define modules with their permissions
  const moduleDefinitions = [
    {
      code: 'dashboard',
      name: 'Dashboard',
      description: 'Home dashboard and overview',
      icon: 'Home',
      permissions: [
        { action: 'read', name: 'View Dashboard', description: 'View the dashboard' },
      ],
    },
    {
      code: 'staff',
      name: 'Staff Management',
      description: 'Manage staff members and their information',
      icon: 'Users',
      permissions: [
        { action: 'create', name: 'Create Staff', description: 'Add new staff members' },
        { action: 'read', name: 'View Staff', description: 'View staff list and details' },
        { action: 'update', name: 'Edit Staff', description: 'Modify staff information' },
        { action: 'delete', name: 'Delete Staff', description: 'Remove staff members' },
      ],
    },
    {
      code: 'staff_group',
      name: 'Staff Groups',
      description: 'Manage staff groups and assignments',
      icon: 'UsersRound',
      permissions: [
        { action: 'create', name: 'Create Group', description: 'Create new staff groups' },
        { action: 'read', name: 'View Groups', description: 'View staff groups' },
        { action: 'update', name: 'Edit Group', description: 'Modify staff groups' },
        { action: 'delete', name: 'Delete Group', description: 'Delete staff groups' },
      ],
    },
    {
      code: 'leave',
      name: 'Leave Management',
      description: 'Manage staff leaves and holidays',
      icon: 'CalendarDays',
      permissions: [
        { action: 'create', name: 'Create Leave', description: 'Add new leave records' },
        { action: 'read', name: 'View Leave', description: 'View leave records and calendar' },
        { action: 'update', name: 'Edit Leave', description: 'Modify leave records' },
        { action: 'delete', name: 'Delete Leave', description: 'Delete leave records' },
        { action: 'approve', name: 'Approve Leave', description: 'Approve or reject leave requests' },
      ],
    },
    {
      code: 'roster',
      name: 'Roster Management',
      description: 'Create and manage staff rosters',
      icon: 'Calendar',
      permissions: [
        { action: 'create', name: 'Create Roster', description: 'Generate new rosters' },
        { action: 'read', name: 'View Roster', description: 'View rosters and schedules' },
        { action: 'update', name: 'Edit Roster', description: 'Modify roster assignments' },
        { action: 'delete', name: 'Delete Roster', description: 'Delete rosters' },
        { action: 'publish', name: 'Publish Roster', description: 'Publish rosters to staff' },
      ],
    },
    {
      code: 'constraint',
      name: 'Constraints',
      description: 'Manage scheduling rules and constraints',
      icon: 'Settings2',
      permissions: [
        { action: 'create', name: 'Create Constraint', description: 'Add new constraints' },
        { action: 'read', name: 'View Constraints', description: 'View constraint rules' },
        { action: 'update', name: 'Edit Constraint', description: 'Modify constraints' },
        { action: 'delete', name: 'Delete Constraint', description: 'Delete constraints' },
      ],
    },
    {
      code: 'user',
      name: 'User Management',
      description: 'Manage user accounts',
      icon: 'UserCog',
      permissions: [
        { action: 'create', name: 'Create User', description: 'Create new user accounts' },
        { action: 'read', name: 'View Users', description: 'View user list' },
        { action: 'update', name: 'Edit User', description: 'Modify user accounts' },
        { action: 'delete', name: 'Delete User', description: 'Delete user accounts' },
        { action: 'reset_password', name: 'Reset Password', description: 'Reset user passwords' },
      ],
    },
    {
      code: 'role_permission',
      name: 'Roles & Permissions',
      description: 'Manage role permissions',
      icon: 'ShieldCheck',
      permissions: [
        { action: 'read', name: 'View Permissions', description: 'View role permissions' },
        { action: 'update', name: 'Edit Permissions', description: 'Modify role permissions' },
      ],
    },
    {
      code: 'system_config',
      name: 'System Configuration',
      description: 'Global system settings',
      icon: 'Sliders',
      permissions: [
        { action: 'read', name: 'View Config', description: 'View system configuration' },
        { action: 'update', name: 'Edit Config', description: 'Modify system configuration' },
      ],
    },
    {
      code: 'shift_config',
      name: 'Shift Configuration',
      description: 'Shift types and definitions',
      icon: 'Clock',
      permissions: [
        { action: 'read', name: 'View Shifts', description: 'View shift configurations' },
        { action: 'update', name: 'Edit Shifts', description: 'Modify shift configurations' },
      ],
    },
    {
      code: 'reports',
      name: 'Reports',
      description: 'View and export reports',
      icon: 'BarChart3',
      permissions: [
        { action: 'read', name: 'View Reports', description: 'View reports and analytics' },
        { action: 'export', name: 'Export Reports', description: 'Export reports to file' },
      ],
    },
    {
      code: 'request',
      name: 'Requests',
      description: 'Leave and schedule change requests',
      icon: 'FileText',
      permissions: [
        { action: 'create', name: 'Submit Request', description: 'Submit leave/change requests' },
        { action: 'read', name: 'View Requests', description: 'View requests' },
        { action: 'approve', name: 'Approve Request', description: 'Approve/reject requests' },
      ],
    },
  ]

  // Create modules and permissions
  for (let sortOrder = 0; sortOrder < moduleDefinitions.length; sortOrder++) {
    const moduleDef = moduleDefinitions[sortOrder]
    const module = await prisma.permissionModule.create({
      data: {
        code: moduleDef.code,
        name: moduleDef.name,
        description: moduleDef.description,
        icon: moduleDef.icon,
        sortOrder,
        isActive: true,
      },
    })

    for (let permOrder = 0; permOrder < moduleDef.permissions.length; permOrder++) {
      const permDef = moduleDef.permissions[permOrder]
      const permission = await prisma.permission.create({
        data: {
          moduleId: module.id,
          code: `${moduleDef.code}:${permDef.action}`,
          name: permDef.name,
          description: permDef.description,
          action: permDef.action,
          sortOrder: permOrder,
          isActive: true,
        },
      })

      // Grant all permissions to SUPER_ADMIN
      await prisma.rolePermission.create({
        data: {
          role: UserRole.SUPER_ADMIN,
          permissionId: permission.id,
          isGranted: true,
        },
      })

      // Grant most permissions to ADMIN (except system config and role management edit)
      const adminDenied = [
        'system_config:update',
        'role_permission:update',
        'shift_config:update',
      ]
      if (!adminDenied.includes(`${moduleDef.code}:${permDef.action}`)) {
        await prisma.rolePermission.create({
          data: {
            role: UserRole.ADMIN,
            permissionId: permission.id,
            isGranted: true,
          },
        })
      }

      // Grant limited permissions to USER
      const userAllowed = [
        'dashboard:read',
        'roster:read',
        'leave:read',     // View leave calendar and records
        'leave:create',   // Create own leave (server validates ownership)
        'request:create',
        'request:read',
      ]
      if (userAllowed.includes(`${moduleDef.code}:${permDef.action}`)) {
        await prisma.rolePermission.create({
          data: {
            role: UserRole.USER,
            permissionId: permission.id,
            isGranted: true,
          },
        })
      }
    }
  }
  console.log('✅ Created permission modules and permissions with default role assignments')

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
      minHoursPerMonth: 144,
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

  // Create Staff for Demo Hospital Nursing Unit
  // 14 nurses with various ranks and roles
  // IC role: First 9 staff (3 Male, 6 Female)
  // Non-IC role: Remaining 5 staff (all Female)
  // Each staff member gets a User account (1:1 relationship)
  const staffData = [
    // IC Role Staff (Senior nurses with IC certification)
    { visibleId: 'NUR001', username: 'michael.wong', name: 'Michael Wong', email: 'michael.wong@orto.ai', rank: 'SNO', gender: 'M' as const },
    { visibleId: 'NUR002', username: 'grace.chen', name: 'Grace Chen', email: 'grace.chen@orto.ai', rank: 'SRN', gender: 'F' as const },
    { visibleId: 'NUR003', username: 'dorothy.lee', name: 'Dorothy Lee', email: 'dorothy.lee@orto.ai', rank: 'SRN', gender: 'F' as const },
    { visibleId: 'NUR004', username: 'alan.lam', name: 'Alan Lam', email: 'alan.lam@orto.ai', rank: 'RN', gender: 'M' as const },
    { visibleId: 'NUR005', username: 'emily.tan', name: 'Emily Tan', email: 'emily.tan@orto.ai', rank: 'RN', gender: 'F' as const },
    { visibleId: 'NUR006', username: 'john.liu', name: 'John Liu', email: 'john.liu@orto.ai', rank: 'RN', gender: 'M' as const },
    { visibleId: 'NUR007', username: 'polly.cheung', name: 'Polly Cheung', email: 'polly.cheung@orto.ai', rank: 'RN', gender: 'F' as const },
    { visibleId: 'NUR008', username: 'pinky.yip', name: 'Pinky Yip', email: 'pinky.yip@orto.ai', rank: 'RN', gender: 'F' as const },
    { visibleId: 'NUR009', username: 'macy.hui', name: 'Macy Hui', email: 'macy.hui@orto.ai', rank: 'RN', gender: 'F' as const },
    // Non-IC Role Staff (Junior nurses)
    { visibleId: 'NUR010', username: 'joey.fung', name: 'Joey Fung', email: 'joey.fung@orto.ai', rank: 'RN', gender: 'F' as const },
    { visibleId: 'NUR011', username: 'amy.chow', name: 'Amy Chow', email: 'amy.chow@orto.ai', rank: 'RN', gender: 'F' as const },
    { visibleId: 'NUR012', username: 'sammi.ho', name: 'Sammi Ho', email: 'sammi.ho@orto.ai', rank: 'RN', gender: 'F' as const },
    { visibleId: 'NUR013', username: 'janice.lau', name: 'Janice Lau', email: 'janice.lau@orto.ai', rank: 'RN', gender: 'F' as const },
    { visibleId: 'NUR014', username: 'tracy.ma', name: 'Tracy Ma', email: 'tracy.ma@orto.ai', rank: 'RN', gender: 'F' as const },
  ]

  const users = await Promise.all(
    staffData.map((s) =>
      createUserWithStaff({
        username: s.username,
        email: s.email,
        name: s.name,
        password: 'password',
        role: UserRole.USER,
        visibleId: s.visibleId,
        rank: s.rank,
        gender: s.gender,
      })
    )
  )
  const staff = users.map((u) => u.staff!)
  console.log(`✅ Created ${staff.length} staff members with user accounts`)

  // Single staff group for all nurses
  const masterGroup = await prisma.staffGroup.create({
    data: { name: 'Ward A Nursing Team', description: 'General Ward A - Demo Hospital' },
  })
  for (const s of staff) {
    await prisma.staff.update({ where: { id: s.id }, data: { staffGroupId: masterGroup.id } })
  }
  console.log('✅ Assigned all staff to Ward A Nursing Team')

  // Assign roles: First 9 are IC, remaining 5 are Non-IC
  const staffRoleData: { staffId: string; roleId: string }[] = []
  staff.slice(0, 9).forEach(s => staffRoleData.push({ staffId: s.id, roleId: roleIC.id }))
  staff.slice(9).forEach(s => staffRoleData.push({ staffId: s.id, roleId: roleNonIC.id }))
  await prisma.staffRole.createMany({ data: staffRoleData })
  console.log('✅ Assigned IC role to first 9 staff, Non-IC role to remaining 5')

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
      name: 'Afternoon Coverage',
      type: 'vertical_sum',
      description: 'Exactly 4 staff on afternoon shift',
      config: { time_slot: 'ALL', target_state: 1, operator: '==', value: 4 },
      shiftType: 'APN',
      isRequired: true,
    } as any,
  }))

  // PM shift coverage (state 2) - exactly 4 per day
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'PM Coverage',
      type: 'vertical_sum',
      description: 'Exactly 4 staff on PM shift',
      config: { time_slot: 'ALL', target_state: 2, operator: '==', value: 4 },
      shiftType: 'APN',
      isRequired: true,
    } as any,
  }))

  // Night shift coverage (state 3)
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Night Coverage',
      type: 'vertical_sum',
      description: 'Exactly 2 staff on night shift',
      config: { time_slot: 'ALL', target_state: 3, operator: '==', value: 2 },
      shiftType: 'APN',
      isRequired: true,
    } as any,
  }))

  // ========== ATTRIBUTE-BASED COVERAGE (IC Role) - APN-specific ==========
  // IC coverage for each shift type
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'IC Afternoon Coverage',
      type: 'attribute_vertical_sum',
      description: 'At least one IC on each afternoon shift',
      config: { time_slot: 'ALL', target_state: 1, operator: '>=', value: 1, attribute: 'roles', attribute_values: ['IC'] },
      shiftType: 'APN',
      isRequired: true,
    } as any,
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'IC PM Coverage',
      type: 'attribute_vertical_sum',
      description: 'At least one IC on each PM shift',
      config: { time_slot: 'ALL', target_state: 2, operator: '>=', value: 1, attribute: 'roles', attribute_values: ['IC'] },
      shiftType: 'APN',
      isRequired: true,
    } as any,
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'IC Night Coverage',
      type: 'attribute_vertical_sum',
      description: 'At least one IC on each night shift',
      config: { time_slot: 'ALL', target_state: 3, operator: '>=', value: 1, attribute: 'roles', attribute_values: ['IC'] },
      shiftType: 'APN',
      isRequired: true,
    } as any,
  }))

  // ========== ATTRIBUTE-BASED COVERAGE (Gender) - APN-specific ==========
  // Female coverage for each shift type
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Female Afternoon Coverage',
      type: 'attribute_vertical_sum',
      description: 'At least one female on each afternoon shift',
      config: { time_slot: 'ALL', target_state: 1, operator: '>=', value: 1, attribute: 'gender', attribute_values: ['F'] },
      shiftType: 'APN',
      isRequired: true,
    } as any,
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Female PM Coverage',
      type: 'attribute_vertical_sum',
      description: 'At least one female on each PM shift',
      config: { time_slot: 'ALL', target_state: 2, operator: '>=', value: 1, attribute: 'gender', attribute_values: ['F'] },
      shiftType: 'APN',
      isRequired: true,
    } as any,
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Female Night Coverage',
      type: 'attribute_vertical_sum',
      description: 'At least one female on each night shift',
      config: { time_slot: 'ALL', target_state: 3, operator: '>=', value: 1, attribute: 'gender', attribute_values: ['F'] },
      shiftType: 'APN',
      isRequired: true,
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
      isRequired: true,
    } as any
  }))
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Block NIGHT→PM Transition',
      type: 'pattern_block',
      description: 'Prevent immediate night then PM shift next day',
      config: { pattern: ['NIGHT', 'PM'], state_mapping: { NIGHT: 3, AFTERNOON: 1, PM: 2, OFF: 0 } },
      shiftType: 'APN',
      isRequired: true,
    } as any
  }))

  // ==========================================================================
  // 7E MODE CONSTRAINTS (FN/ADM/RUL/003 - 7E Staffing)
  // ==========================================================================
  // 7E States: 0=Off, 1=Day (7), 2=Night (E)
  // Coverage: Day ==4, Night ==2
  // Compound coverage: Female IC >= 1 on each shift type
  // Pattern blocks: Night→Day transition forbidden

  // ========== COVERAGE CONSTRAINTS (7E-specific) ==========
  // Day shift coverage (state 1) - exactly 4 staff
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Day Coverage',
      type: 'vertical_sum',
      description: 'Exactly 4 staff on day shift (7)',
      config: { time_slot: 'ALL', target_state: 1, operator: '==', value: 4 },
      shiftType: 'SEVEN_E',
      isRequired: true,
    } as any,
  }))

  // Night shift coverage (state 2) - exactly 2 staff
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Night Coverage',
      type: 'vertical_sum',
      description: 'Exactly 2 staff on night shift (E)',
      config: { time_slot: 'ALL', target_state: 2, operator: '==', value: 2 },
      shiftType: 'SEVEN_E',
      isRequired: true,
    } as any,
  }))

  // ========== COMPOUND ATTRIBUTE CONSTRAINTS (Female IC) - 7E-specific ==========
  // Female IC coverage for Day shift - requires compound filter (gender=F AND role=IC)
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Female IC Day Coverage',
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
      isRequired: true,
    } as any,
  }))

  // Female IC coverage for Night shift - requires compound filter (gender=F AND role=IC)
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Female IC Night Coverage',
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
      isRequired: true,
    } as any,
  }))

  // ========== PATTERN BLOCKS (7E-specific Safety Rules) ==========
  // Block dangerous Night→Day transition (prevents fatigue)
  // Requirement #8: Able to assign dayoff after E/N shifts
  constraints.push(await prisma.constraint.create({
    data: {
      name: 'Block NIGHT→DAY Transition',
      type: 'pattern_block',
      description: 'Prevent immediate night then day shift next day (fatigue risk)',
      config: { pattern: ['NIGHT', 'DAY'], state_mapping: { NIGHT: 2, DAY: 1, OFF: 0 } },
      shiftType: 'SEVEN_E',
      isRequired: true,
    } as any
  }))

  console.log(`✅ Created ${constraints.length} constraints (APN + 7E modes)`)

  // --------------------------------------------------------------------------
  // REQUIREMENTS FULFILLMENT SUMMARY (Beta Release):
  // --------------------------------------------------------------------------
  // 1. ✅ Two duty types: 7/E (12h) and A/P/N (8.5h) - via ShiftTypeConfig + ShiftDefinition
  // 2. ✅ Individual working hours: via ShiftTypeConfig minHoursPerMonth/maxHoursPerMonth (160-190h)
  // 3. ✅ Target manpower per shift: via vertical_sum constraints (4D2E for 7E, 4A4P2N for APN)
  // 4. ✅ Balance E/N shifts: via night_distribution system config (4-6 per person)
  // 5. ✅ IC role in every shift: via attribute_vertical_sum constraints (IC Coverage)
  // 6. ✅ Avoid male-only shift: via attribute_vertical_sum constraints (Female Coverage)
  // 7. ✅ Shift blocks (Requirement #7 has 4 parts):
  //    a. ✅ max_consecutive_nights = 3 (EEE max, no EEEE)
  //    b. ✅ min_consecutive_nights = 2 (no isolated E, must be EE or EEE)
  //    c. ✅ post_night_rest = 2 days off after night block (EE→OO→7 allowed)
  //    d. ✅ night_block_gap = 7 days between night blocks (1 week separation)
  // 8. ✅ Dayoff after E/N: via post_night_rest + pattern_block constraints
  // 9. 🚧 Balance dayoff monthly: TODO - add dayoff distribution constraint
  // --------------------------------------------------------------------------

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
  
  // Rule #7a: Max consecutive night shifts = 3
  // Business rule: No more than 3 consecutive night shifts (EEE max)
  await upsertItem(coreGlobal.id, 'max_consecutive_nights', {
    label: 'Max Consecutive Night Shifts (3)',
    type: 'nurse_safety',
    value: {
      limit: 3,
      target_state: 3, // APN night state
      time_slots: Array.from({ length: 30 }, (_, i) => i),
    },
    locked: true,
  })

  // Rule #7b: Min consecutive night shifts = 2
  // Business rule: No isolated single night shifts (E alone not allowed, must be EE or EEE)
  await upsertItem(coreGlobal.id, 'min_consecutive_nights', {
    label: 'Min Consecutive Night Shifts (2)',
    type: 'nurse_safety',
    value: {
      limit: 2,         // Minimum 2 consecutive nights per block (same key as max for consistency)
      target_state: 2,  // 7E night state (E=2); mapper will use max state dynamically
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

  // Rule #7c: Post-night rest - 2 days off after night block before any shift
  // Business rule: After finishing a night block (of any length), must have at least 2 full days off
  // before returning to any shift (day or night)
  // Pattern: EE → O O → 7 (allowed) or EEE → O O → 7 (allowed)
  // Uses dynamic block detection - triggers on ANY block end regardless of length
  await upsertItem(coreGlobal.id, 'post_night_rest', {
    label: 'Post-Night Rest (2 Days Off After Night Block)',
    type: 'nurse_safety',
    value: {
      enabled: true,
      rest_days: 2,     // Require 2 days rest after any night block ends
      target_state: 2,  // 7E night state (E=2); will fallback for APN
    },
    locked: true,
  })

  // Rule #7d: Night block gap - 1 week (7 days) between night blocks
  // Business rule: After a night block ends, at least 7 days before starting another night block
  // Pattern: EE → (at least 7 non-E days) → EEE (allowed)
  // This prevents: EE → O O → EEE (only 2 day gap - NOT allowed)
  await upsertItem(coreGlobal.id, 'night_block_gap', {
    label: 'Night Block Gap (1 Week Between Blocks)',
    type: 'nurse_safety',
    value: {
      enabled: true,
      min_gap_days: 7,  // Minimum 7 days between night blocks
      target_state: 2,  // 7E night state (E=2); mapper will use max state dynamically
      time_slots: Array.from({ length: 30 }, (_, i) => i),
    },
    locked: true,
  })

  // Rule #5: Night shift distribution - 3 to 6 nights per person per month
  // With 14 staff, 2 per night × 30 days = 60 nights total / 14 = ~4.3 avg
  // Allow range 3-6 for fair distribution with coverage constraints
  // NOTE: target_state is ignored; mapper uses Math.max(availableStates) for night state
  await upsertItem(coreGlobal.id, 'night_distribution', {
    label: 'Night Distribution (3-6 per Person)',
    type: 'fairness',
    value: {
      enabled: true,
      min_nights: 3,
      max_nights: 6,
      target_state: 2,  // 7E night state (E=2); mapper will use max state dynamically
      time_slots: Array.from({ length: 30 }, (_, i) => i),
    },
    locked: false,
  })

  // NOTE: Rule #9 (Balance dayoff monthly) is a PLACEHOLDER
  // Days off are determined by coverage requirements - the solver assigns OFF state
  // to remaining slots after satisfying coverage constraints.
  // Future enhancement: Add soft optimization objective to balance dayoffs across staff.

  // Fairness weights for penalty calculation (exclude weekends)
  // Used by solver to weight soft constraint violations
  await upsertItem(coreGlobal.id, 'fairness_weights', {
    label: 'Fairness Calculation Weights',
    type: 'fairness',
    value: {
      enabled: true,
      // Weights by day of week (0=Sun, 1=Mon, ..., 6=Sat)
      // Exclude weekends (weight = 0), weekdays = 1
      day_weights: {
        0: 0,  // Sunday - exclude
        1: 1,  // Monday
        2: 1,  // Tuesday
        3: 1,  // Wednesday
        4: 1,  // Thursday
        5: 1,  // Friday
        6: 0,  // Saturday - exclude
      },
      penalty_weight: 100,  // Per unit of soft constraint violation
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

  // NOTE: 7E-specific coverage constraints (day==4, night==2, female IC) are now
  // managed via the Constraint table, not system config. This avoids duplication
  // and allows editing via the frontend constraint builder.
  // Removed: seven_e_day_coverage, seven_e_night_coverage, seven_e_female_ic_day,
  //          seven_e_female_ic_night, seven_e_block_transition

  console.log('✅ Seeded system configuration groups and items (upserted)')

  // ============================================================================
  // Seed Public Holidays (FN/ADM/LVE/001)
  // Hong Kong Public Holidays for 2025 and 2026
  // ============================================================================
  
  const publicHolidays2025 = [
    { date: '2025-01-01', name: "New Year's Day" },
    { date: '2025-01-29', name: 'Lunar New Year Day 1' },
    { date: '2025-01-30', name: 'Lunar New Year Day 2' },
    { date: '2025-01-31', name: 'Lunar New Year Day 3' },
    { date: '2025-02-01', name: 'Lunar New Year Day 4 (substitute)' },
    { date: '2025-04-04', name: 'Ching Ming Festival' },
    { date: '2025-04-18', name: 'Good Friday' },
    { date: '2025-04-19', name: 'Day after Good Friday' },
    { date: '2025-04-21', name: 'Easter Monday' },
    { date: '2025-05-01', name: 'Labour Day' },
    { date: '2025-05-05', name: "Buddha's Birthday" },
    { date: '2025-05-31', name: 'Tuen Ng Festival' },
    { date: '2025-07-01', name: 'HKSAR Establishment Day' },
    { date: '2025-10-01', name: 'National Day' },
    { date: '2025-10-07', name: 'Day after Mid-Autumn Festival' },
    { date: '2025-10-29', name: 'Chung Yeung Festival' },
    { date: '2025-12-25', name: 'Christmas Day' },
    { date: '2025-12-26', name: 'Day after Christmas' },
  ]

  const publicHolidays2026 = [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-02-17', name: 'Lunar New Year Day 1' },
    { date: '2026-02-18', name: 'Lunar New Year Day 2' },
    { date: '2026-02-19', name: 'Lunar New Year Day 3' },
    { date: '2026-02-20', name: 'Lunar New Year Day 4 (substitute)' },
    { date: '2026-04-04', name: 'Ching Ming Festival' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-04', name: 'Day after Good Friday' },
    { date: '2026-04-06', name: 'Easter Monday' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-05-24', name: "Buddha's Birthday" },
    { date: '2026-06-19', name: 'Tuen Ng Festival' },
    { date: '2026-07-01', name: 'HKSAR Establishment Day' },
    { date: '2026-09-26', name: 'Day after Mid-Autumn Festival' },
    { date: '2026-10-01', name: 'National Day' },
    { date: '2026-10-18', name: 'Chung Yeung Festival (substitute)' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-26', name: 'Day after Christmas' },
  ]

  // Upsert public holidays (avoid duplicates on re-seed)
  for (const holiday of publicHolidays2025) {
    const holidayDate = new Date(holiday.date + 'T00:00:00Z')
    await prisma.publicHoliday.upsert({
      where: { date: holidayDate },
      update: { name: holiday.name },
      create: {
        date: holidayDate,
        name: holiday.name,
        year: 2025,
        isRecurring: false,
      },
    })
  }

  for (const holiday of publicHolidays2026) {
    const holidayDate = new Date(holiday.date + 'T00:00:00Z')
    await prisma.publicHoliday.upsert({
      where: { date: holidayDate },
      update: { name: holiday.name },
      create: {
        date: holidayDate,
        name: holiday.name,
        year: 2026,
        isRecurring: false,
      },
    })
  }

  console.log('✅ Seeded public holidays for 2025 and 2026')

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
