"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { useStaffWithFilter, useDeleteStaff, useToggleStaffActive, type StaffFilter } from '../hooks/use-staff'
import { AddStaffDialog } from './add-staff-dialog'
import { EditStaffDialog } from './edit-staff-dialog'
import { cn } from '@/lib/utils'

export function StaffList() {
  const [filter, setFilter] = useState<StaffFilter>('active')
  const { data: staff, isLoading } = useStaffWithFilter(filter)
  const deleteStaff = useDeleteStaff()
  const toggleActive = useToggleStaffActive()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<typeof staff[number] | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!staff) return []
    const q = query.toLowerCase()
    return staff.filter(s => {
      const name = s.user?.name || s.visibleId
      const email = s.user?.email || ''
      return (
        name.toLowerCase().includes(q) ||
        (s.visibleId || '').toLowerCase().includes(q) ||
        (s.rank || '').toLowerCase().includes(q) ||
        email.toLowerCase().includes(q)
      )
    })
  }, [staff, query])

  const getStaffName = (s: typeof staff[number]) => s.user?.name || s.visibleId
  const getStaffEmail = (s: typeof staff[number]) => s.user?.email || '—'

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete ${name}? This cannot be undone.`)) {
      deleteStaff.mutate(id)
    }
  }

  const handleToggleActive = (id: string, name: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate'
    if (confirm(`Are you sure you want to ${action} ${name}?`)) {
      toggleActive.mutate(id)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Staff Members</span>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as StaffFilter)}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
                <SelectItem value="all">All Staff</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Search..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="h-8 w-40"
            />
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No staff found.
          </p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Active</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow 
                    key={s.id}
                    className={cn(!s.isActive && "opacity-50 bg-muted/30")}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={s.isActive}
                          onCheckedChange={() => handleToggleActive(s.id, getStaffName(s), s.isActive)}
                          disabled={toggleActive.isPending}
                          aria-label={`Toggle ${getStaffName(s)} active status`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-muted-foreground">{s.rank || '—'}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className={cn(!s.isActive && "line-through")}>{getStaffName(s)}</span>
                        {!s.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{s.visibleId}</TableCell>
                    <TableCell>{s.gender || '—'}</TableCell>
                    <TableCell>
                      {s.staffRoles?.map(sr => sr.role.name).join(', ') || '—'}
                    </TableCell>
                    <TableCell>{getStaffEmail(s)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingStaff(s)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(s.id, getStaffName(s))}
                          disabled={deleteStaff.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <AddStaffDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      {editingStaff && (
        <EditStaffDialog
          open={!!editingStaff}
          onOpenChange={(open) => !open && setEditingStaff(null)}
          staff={editingStaff}
        />
      )}
    </Card>
  )
}
