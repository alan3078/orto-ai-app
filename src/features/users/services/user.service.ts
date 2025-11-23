import { prisma } from '@/lib/prisma'

export type User = {
  id: number
  email: string
  name: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateUserDto = {
  email: string
  name?: string
}

export class UserService {
  async getUsers(): Promise<User[]> {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    })
  }

  async createUser(data: CreateUserDto): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name || null
      }
    })
  }

  async getUserById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id }
    })
  }

  async updateUser(id: number, data: Partial<CreateUserDto>): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        name: data.name || null
      }
    })
  }

  async deleteUser(id: number): Promise<User> {
    return prisma.user.delete({
      where: { id }
    })
  }
}

export const userService = new UserService()
