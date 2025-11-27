"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'
import { useStaff, useDeleteStaff } from '../hooks/use-staff'
import { AddStaffDialog } from './add-staff-dialog'

export function StaffList() {
  const { data: staff, isLoading } = useStaff()
  const deleteStaff = useDeleteStaff()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!staff) return []
    const q = query.toLowerCase()
    return staff.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.employeeId || '').toLowerCase().includes(q) ||
      (s.rank || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    )
  }, [staff, query])

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete ${name}? This cannot be undone.`)) {
      deleteStaff.mutate(id)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Staff Members</span>
          <div className="flex items-center gap-2">
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
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-muted-foreground">{s.rank || '—'}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.employeeId}</TableCell>
                    <TableCell>{s.gender || '—'}</TableCell>
                    <TableCell>
                      {s.staffRoles?.map(sr => sr.role.name).join(', ') || '—'}
                    </TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(s.id, s.name)}
                        disabled={deleteStaff.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <AddStaffDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  )
}
