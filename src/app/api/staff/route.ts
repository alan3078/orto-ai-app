import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(staff)
  } catch (error) {
    console.error('Failed to fetch staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, employeeId } = body

    if (!name || !employeeId) {
      return NextResponse.json({ error: 'Name and Employee ID are required' }, { status: 400 })
    }

    const staff = await prisma.staff.create({
      data: {
        name,
        email: email || null,
        employeeId,
      },
    })
    return NextResponse.json(staff, { status: 201 })
  } catch (error) {
    console.error('Failed to create staff:', error)
    return NextResponse.json({ error: 'Failed to create staff' }, { status: 500 })
  }
}
