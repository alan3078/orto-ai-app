'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Power, PowerOff, History } from 'lucide-react'
import { toast } from 'sonner'
import {
  getShiftDefinitionsAction,
  createShiftDefinitionAction,
  updateShiftDefinitionAction,
  toggleShiftActiveAction,
  hardDeleteShiftAction,
  getShiftAuditLogAction,
} from '@/app/actions/shift-definition.actions'
import { ShiftDefinitionDialog } from './shift-definition-dialog'

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export function ShiftDefinitionManagement() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [auditDialogOpen, setAuditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<{
    id: string
    code: string
    startMinutes: number
    durationMinutes: number
  } | null>(null)
  const [deletingShift, setDeletingShift] = useState<{ id: string; code: string } | null>(null)
  const [deleteReason, setDeleteReason] = useState('')

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shift-definitions'],
    queryFn: async () => {
      const result = await getShiftDefinitionsAction()
      if (!result.success) throw new Error(result.error)
      return result.shifts
    },
  })

  const { data: audits } = useQuery({
    queryKey: ['shift-audits'],
    queryFn: async () => {
      const result = await getShiftAuditLogAction()
      if (!result.success) throw new Error(result.error)
      return result.audits
    },
    enabled: auditDialogOpen,
  })

  const createMutation = useMutation({
    mutationFn: async (data: {
      code: string
      startMinutes: number
      durationMinutes: number
    }) => {
      const result = await createShiftDefinitionAction(data)
      if (!result.success) throw new Error(result.error)
      return result.shift
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-definitions'] })
      toast.success('Shift definition created')
      setDialogOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: { code?: string; startMinutes?: number; durationMinutes?: number }
    }) => {
      const result = await updateShiftDefinitionAction(id, data)
      if (!result.success) throw new Error(result.error)
      return result.shift
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-definitions'] })
      toast.success('Shift definition updated')
      setDialogOpen(false)
      setEditingShift(null)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await toggleShiftActiveAction(id)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-definitions'] })
      toast.success('Shift status updated')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const result = await hardDeleteShiftAction(id, reason, 'admin')
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-definitions'] })
      queryClient.invalidateQueries({ queryKey: ['shift-audits'] })
      toast.success('Shift definition deleted (audit recorded)')
      setDeleteDialogOpen(false)
      setDeletingShift(null)
      setDeleteReason('')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const handleEdit = (shift: {
    id: string
    code: string
    startMinutes: number
    durationMinutes: number
  }) => {
    setEditingShift(shift)
    setDialogOpen(true)
  }

  const handleDelete = (shift: { id: string; code: string }) => {
    setDeletingShift(shift)
    setDeleteDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingShift(null)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Shift Definitions</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAuditDialogOpen(true)}
              >
                <History className="h-4 w-4 mr-1" />
                Audit Log
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingShift(null)
                  setDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Shift
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !shifts || shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No shift definitions found. Create one to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-mono font-bold">
                      {shift.code}
                    </TableCell>
                    <TableCell>{formatTime(shift.startMinutes)}</TableCell>
                    <TableCell>{formatDuration(shift.durationMinutes)}</TableCell>
                    <TableCell>
                      <Badge variant={shift.isActive ? 'default' : 'secondary'}>
                        {shift.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(shift)}
                          disabled={updateMutation.isPending}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleMutation.mutate(shift.id)}
                          disabled={toggleMutation.isPending}
                        >
                          {shift.isActive ? (
                            <PowerOff className="h-4 w-4 text-orange-500" />
                          ) : (
                            <Power className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(shift)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ShiftDefinitionDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        shift={editingShift}
        onSubmit={(data) => {
          if (editingShift) {
            updateMutation.mutate({ id: editingShift.id, data })
          } else {
            createMutation.mutate(data)
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Shift Definition</DialogTitle>
            <DialogDescription>
              This will permanently delete shift <strong>{deletingShift?.code}</strong>.
              An audit record will be created. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason for deletion (optional)</Label>
              <Textarea
                id="reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter reason for audit trail..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setDeletingShift(null)
                  setDeleteReason('')
                }}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deletingShift) {
                    deleteMutation.mutate({
                      id: deletingShift.id,
                      reason: deleteReason || undefined,
                    })
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shift Deletion Audit Log</DialogTitle>
            <DialogDescription>
              History of deleted shift definitions
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {!audits || audits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No deletion records found.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Deleted</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell className="font-mono font-bold">
                        {audit.code}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatTime(audit.startMinutes)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDuration(audit.durationMinutes)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(audit.deletedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs">{audit.deletedBy}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {audit.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
