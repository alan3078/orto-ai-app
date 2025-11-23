import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const group = await prisma.staffGroup.findUnique({
      where: { id },
      include: {
        staff: {
          orderBy: { name: 'asc' },
        },
      },
    })
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    return NextResponse.json(group)
  } catch (error) {
    console.error('Failed to fetch staff group:', error)
    return NextResponse.json({ error: 'Failed to fetch staff group' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { name, description, addStaffIds, removeStaffIds } = body as {
      name?: string
      description?: string
      addStaffIds?: string[]
      removeStaffIds?: string[]
    }

    const existing = await prisma.staffGroup.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

    // Update group metadata
    const updatedGroup = await prisma.staffGroup.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
      },
    })

    // Add staff (set staffGroupId)
    if (addStaffIds && addStaffIds.length > 0) {
      await prisma.staff.updateMany({
        where: { id: { in: addStaffIds } },
        data: { staffGroupId: id },
      })
    }

    // Remove staff (null staffGroupId)
    if (removeStaffIds && removeStaffIds.length > 0) {
      await prisma.staff.updateMany({
        where: { id: { in: removeStaffIds } },
        data: { staffGroupId: null },
      })
    }

    const result = await prisma.staffGroup.findUnique({
      where: { id },
      include: { staff: true },
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to update staff group:', error)
    return NextResponse.json({ error: 'Failed to update staff group' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.staffGroup.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete staff group:', error)
    return NextResponse.json({ error: 'Failed to delete staff group' }, { status: 500 })
  }
}
