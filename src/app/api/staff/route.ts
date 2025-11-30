import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sortStaff } from '@/lib/staff-sort'
import { hash } from 'bcryptjs'
import { UserRole } from '@prisma/client'

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({
      where: { isActive: true, deletedAt: null },
      include: { 
        user: { select: { name: true, email: true } },
        staffRoles: { include: { role: true } },
      },
    })

    const sorted = sortStaff(staff)
    return NextResponse.json(sorted)
  } catch (error) {
    console.error('Failed to fetch staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, visibleId, password } = body

    if (!name || !visibleId) {
      return NextResponse.json({ error: 'Name and Staff ID are required' }, { status: 400 })
    }

    // Generate username from visibleId (lowercase)
    const username = visibleId.toLowerCase()

    const passwordHash = await hash(password || 'changeme123', 12)

    // Create User + Staff together
    const user = await prisma.user.create({
      data: {
        username,
        email: email || null,
        name,
        passwordHash,
        role: UserRole.USER,
        isActive: true,
        mustResetPassword: true,
        staff: {
          create: {
            visibleId,
            isActive: true,
          },
        },
      },
      include: { staff: true },
    })
    return NextResponse.json(user.staff, { status: 201 })
  } catch (error) {
    console.error('Failed to create staff:', error)
    return NextResponse.json({ error: 'Failed to create staff' }, { status: 500 })
  }
}
