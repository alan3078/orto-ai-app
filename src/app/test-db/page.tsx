'use client'

import { CreateUserForm } from '@/features/users/components/create-user-form'
import { UserList } from '@/features/users/components/user-list'
import { useUsers } from '@/features/users/hooks/use-users'

export default function TestDbPage() {
  const { data: users } = useUsers()

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Database Test Page</h1>
      
      <div className="mb-8 p-6 border rounded-lg bg-white dark:bg-zinc-900">
        <h2 className="text-xl font-semibold mb-4">Create New User</h2>
        <CreateUserForm />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Users ({users?.length || 0})</h2>
        <UserList />
      </div>
    </div>
  )
}
