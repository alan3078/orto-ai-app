import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { fetchUsers } from '@/app/actions/user.actions'
import { UserList } from './user-list'

export default async function UsersPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'MANAGER') {
    redirect('/admin/home')
  }

  const users = await fetchUsers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts and access permissions
        </p>
      </div>

      <UserList initialUsers={users} />
    </div>
  )
}
