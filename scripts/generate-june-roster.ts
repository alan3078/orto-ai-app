import { prisma } from '@/lib/prisma'
import { SolverIntegrationService } from '@/services/solver-integration.service'

async function main() {
  const startDate = new Date('2024-06-01T00:00:00Z')

  // Load all staff
  const staff = await prisma.staff.findMany({ where: { isActive: true }, select: { id: true } })
  if (staff.length === 0) throw new Error('No staff found. Seed first.')

  // Fetch constraints we seeded (take all active)
  const constraints = await prisma.constraint.findMany({ where: { isActive: true }, select: { id: true } })
  if (constraints.length === 0) throw new Error('No constraints found. Seed first.')

  const solver = new SolverIntegrationService()
  const rosterName = 'June 2024 24/7 Roster'
  const timeSlots = 30 // June days

  const staffIds = staff.map(s => s.id)
  const constraintIds = constraints.map(c => c.id)

  console.log(`Generating roster: staff=${staffIds.length}, constraints=${constraintIds.length}`)

  const { rosterId, status } = await solver.generateRoster(
    rosterName,
    startDate,
    timeSlots,
    staffIds,
    constraintIds,
    [], // systemConstraints
    {}  // resourceAttributes (integrated in build phase now)
  )

  console.log(`Solver returned status=${status}, rosterId=${rosterId}`)

  // Fetch shifts & transform to JSON structure Day/Night arrays per date
  const roster = await prisma.roster.findUnique({ where: { id: rosterId } })
  const shifts = await prisma.shift.findMany({ where: { rosterId }, include: { staff: true } })

  // states: 0 OFF, 1 DAY, 2 NIGHT
  const scheduleByDay: any[] = []
  for (let d = 0; d < timeSlots; d++) {
    const dayRecords = shifts.filter(s => s.timeSlot === d)
    scheduleByDay.push({
      date: new Date(startDate.getTime() + d * 86400000).toISOString().slice(0, 10),
      day_shift: dayRecords.filter(r => r.state === 1).map(r => r.staff.employeeId),
      night_shift: dayRecords.filter(r => r.state === 2).map(r => r.staff.employeeId),
    })
  }

  const output = {
    month: '2024-06',
    rosterId,
    status,
    days: scheduleByDay,
  }

  console.log(JSON.stringify(output, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
