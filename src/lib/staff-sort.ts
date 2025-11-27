import type { Gender } from '@prisma/client'
import { StaffRank, RoleName } from '@/types/enums'

type Maybe<T> = T | null | undefined

type StaffLike = {
  name?: string
  rank?: Maybe<string>
  gender?: Maybe<Gender>
  staffRoles?: Array<{ role?: { name?: string | null } | null }>
}

const rankPriority: Partial<Record<StaffRank, number>> = {
  [StaffRank.SNO]: 0,
  [StaffRank.SRN]: 1,
  [StaffRank.RN]: 2,
  [StaffRank.RN_CW]: 2,
}

function getRankOrder(rank: Maybe<string>): number {
  if (!rank) return 99
  const key = String(rank)
  return (rankPriority as Record<string, number>)[key] ?? 99
}

function hasICRole(staff: StaffLike): boolean {
  const roles = staff.staffRoles || []
  return roles.some((r) => r?.role?.name === RoleName.IC)
}

function getGenderOrder(gender: Maybe<Gender>): number {
  if (gender === 'M') return 0
  if (gender === 'F') return 1
  return 2
}

export function staffComparator<A extends StaffLike>(a: A, b: A): number {
  // 1) Rank: SNO -> SRN -> RN (others last)
  const ar = getRankOrder(a.rank)
  const br = getRankOrder(b.rank)
  if (ar !== br) return ar - br

  // 2) Role: IC -> non-IC
  const ai = hasICRole(a) ? 0 : 1
  const bi = hasICRole(b) ? 0 : 1
  if (ai !== bi) return ai - bi

  // 3) Gender: M -> F -> (unknown)
  const ag = getGenderOrder(a.gender)
  const bg = getGenderOrder(b.gender)
  if (ag !== bg) return ag - bg

  // 4) Tiebreaker: name ASC
  const an = (a.name || '').toLowerCase()
  const bn = (b.name || '').toLowerCase()
  if (an < bn) return -1
  if (an > bn) return 1
  return 0
}

export function sortStaff<T extends StaffLike>(items: T[]): T[] {
  return items.sort(staffComparator)
}
