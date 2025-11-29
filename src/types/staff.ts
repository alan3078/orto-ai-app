import type { Gender } from '@prisma/client'

export interface Role {
  id: string
  name: string
  description: string | null
  order: number
}

export interface StaffRole {
  staffId: string
  roleId: string
  role: Role
}

export interface StaffGroup {
  id: string
  name: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'MANAGER' | 'MEMBER'
  isActive: boolean
  deletedAt: Date | null
}

export interface Staff {
  id: string
  visibleId: string
  rank: string | null
  isActive: boolean
  staffGroupId: string | null
  gender: Gender | null
  userId: string
  user: User
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  staffRoles: StaffRole[]
  staffGroup: StaffGroup | null
}
