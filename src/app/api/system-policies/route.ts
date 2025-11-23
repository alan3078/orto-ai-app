import { NextResponse } from 'next/server'
import { fetchSystemPolicies } from '@/features/engine/mapper'

export async function GET() {
  try {
    const policies = await fetchSystemPolicies({
      includeGlobal: true,
      includeRoster: true,
    })

    // Return simplified format for UI
    const simplified = policies.map((p) => ({
      id: p.id,
      label: p.label,
      scope: p.scope,
      value: p.value,
    }))

    return NextResponse.json({ success: true, policies: simplified })
  } catch (error) {
    console.error('[API] Failed to fetch system policies:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch policies', policies: [] },
      { status: 500 }
    )
  }
}
