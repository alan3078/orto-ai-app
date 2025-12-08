import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const groups = await prisma.staffGroup.findMany({
      orderBy: { name: 'asc' },
      include: { staff: { select: { id: true } } },
    });
    const shaped = groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      isActive: g.isActive,
      memberCount: g.staff.length,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));
    return NextResponse.json(shaped);
  } catch (error) {
    console.error('Failed to fetch staff groups:', error);
    return NextResponse.json({ error: 'Failed to fetch staff groups' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body;
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const group = await prisma.staffGroup.create({
      data: { name, description: description || null },
    });
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Failed to create staff group:', error);
    return NextResponse.json({ error: 'Failed to create staff group' }, { status: 500 });
  }
}
