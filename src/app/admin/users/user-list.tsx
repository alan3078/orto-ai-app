'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  KeyRound,
  UserCheck,
  UserX,
  Shield,
  User as UserIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { toggleUserActiveAction, deleteUserAction } from '@/app/actions/user.actions'
import { CreateUserDialog } from './create-user-dialog'
import { EditUserDialog } from './edit-user-dialog'
import { ResetPasswordDialog } from './reset-password-dialog'
import { UserRole } from '@prisma/client'
import { getRoleDisplayName, isAdmin } from '@/lib/permissions'

type User = {
  id: string
  username: string
  email: string | null
  name: string | null
  role: UserRole
  isActive: boolean
  mustResetPassword: boolean
  lastLoginAt: Date | null
  createdAt: Date
  staff: { id: string; visibleId: string } | null
}

interface UserListProps {
  initialUsers: User[]
}

export function UserList({ initialUsers }: UserListProps) {
  const [users, setUsers] = useState(initialUsers)
  const [isPending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)

  const handleToggleActive = (user: User) => {
    startTransition(async () => {
      const result = await toggleUserActiveAction(user.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`)
        setUsers(prev => 
          prev.map(u => 
            u.id === user.id ? { ...u, isActive: !u.isActive } : u
          )
        )
      }
    })
  }

  const handleDelete = (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.username}? This cannot be undone.`)) {
      return
    }

    startTransition(async () => {
      const result = await deleteUserAction(user.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('User deleted')
        setUsers(prev => prev.filter(u => u.id !== user.id))
      }
    })
  }

  const refreshUsers = () => {
    // Trigger a page refresh to get updated data
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Linked Staff</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No users found. Create your first user to get started.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className={!user.isActive ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name || user.username}</span>
                      <span className="text-sm text-muted-foreground">@{user.username}</span>
                      {user.email && (
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isAdmin(user.role) ? 'default' : 'secondary'}>
                      {isAdmin(user.role) ? (
                        <><Shield className="h-3 w-3 mr-1" /> {getRoleDisplayName(user.role)}</>
                      ) : (
                        <><UserIcon className="h-3 w-3 mr-1" /> {getRoleDisplayName(user.role)}</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={user.isActive ? 'outline' : 'destructive'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {user.mustResetPassword && (
                        <Badge variant="secondary" className="text-xs">
                          Must reset password
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.staff ? (
                      <span className="text-sm">
                        {user.name} ({user.staff.visibleId})
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Admin (no staff record)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.lastLoginAt ? (
                      <span className="text-sm">
                        {format(new Date(user.lastLoginAt), 'MMM d, yyyy HH:mm')}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isPending}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditUser(user)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setResetPasswordUser(user)}>
                          <KeyRound className="h-4 w-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                          {user.isActive ? (
                            <><UserX className="h-4 w-4 mr-2" /> Deactivate</>
                          ) : (
                            <><UserCheck className="h-4 w-4 mr-2" /> Activate</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(user)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen}
        onSuccess={refreshUsers}
      />

      {editUser && (
        <EditUserDialog
          open={!!editUser}
          onOpenChange={(open: boolean) => !open && setEditUser(null)}
          user={editUser}
          onSuccess={refreshUsers}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordDialog
          open={!!resetPasswordUser}
          onOpenChange={(open: boolean) => !open && setResetPasswordUser(null)}
          user={resetPasswordUser}
          onSuccess={refreshUsers}
        />
      )}
    </div>
  )
}
