'use client'

import { useUsers } from '../hooks/use-users'
import type { User } from '../services/user.service'

export function UserList() {
  const { data: users, isLoading, error } = useUsers()

  if (isLoading) {
    return <p className="text-zinc-500">Loading users...</p>
  }

  if (error) {
    return <p className="text-red-500">Error loading users: {error.message}</p>
  }

  if (!users || users.length === 0) {
    return <p className="text-zinc-500">No users yet. Create one above!</p>
  }

  return (
    <div className="space-y-2">
      {users.map((user: User) => (
        <div key={user.id} className="p-4 border rounded-lg bg-white dark:bg-zinc-900">
          <p className="font-medium">{user.email}</p>
          {user.name && <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.name}</p>}
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Created: {new Date(user.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )
}
