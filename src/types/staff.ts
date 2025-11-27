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

export interface Staff {
  id: string
  employeeId: string
  name: string
  rank: string | null
  email: string | null
  isActive: boolean
  staffGroupId: string | null
  gender: Gender | null
  monthlyMinHours: number | null
  monthlyMaxHours: number | null
  createdAt: Date
  updatedAt: Date
  staffRoles: StaffRole[]
  staffGroup: StaffGroup | null
}
