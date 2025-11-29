'use client'

import { useMemo, useState } from 'react'
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, ChevronDown, Globe, Target, Pencil } from 'lucide-react'
import { useConstraints, useDeleteConstraint, useUpdateConstraint } from '../hooks/use-constraints'
import { AddConstraintForm } from './add-constraint-form'
import { ShiftType } from '@/types/enums'

type ConstraintType = 'point' | 'vertical_sum' | 'ai' | null

interface ConstraintBuilderProps {
  shiftType: ShiftType
}

// Type for constraint being edited
interface EditingConstraint {
  id: string
  name: string
  type: string
  config: any
  description?: string
}

export function ConstraintBuilder({ shiftType }: ConstraintBuilderProps) {
  const { data: constraints, isLoading } = useConstraints()
  const deleteConstraint = useDeleteConstraint()
  const updateConstraint = useUpdateConstraint()
  const [formType, setFormType] = useState<ConstraintType>(null)
  const [isOpen, setIsOpen] = useState(true)
  const [editingConstraint, setEditingConstraint] = useState<EditingConstraint | null>(null)
  const [editFormData, setEditFormData] = useState<{
    name: string
    operator: string
    value: number
    description: string
    isRequired: boolean
  }>({ name: '', operator: '>=', value: 0, description: '', isRequired: true })

  const handleCancel = () => setFormType(null)
  const handleSuccess = () => setFormType(null)

  // Handle edit dialog open
  const handleEditClick = (constraint: any) => {
    setEditingConstraint(constraint)
    setEditFormData({
      name: constraint.name,
      operator: constraint.config?.operator || '>=',
      value: constraint.config?.value || 0,
      description: constraint.description || '',
      isRequired: constraint.isRequired !== false,
    })
  }

  // Handle edit form submit
  const handleEditSubmit = async () => {
    if (!editingConstraint) return
    
    const updatedConfig = {
      ...editingConstraint.config,
      operator: editFormData.operator,
      value: editFormData.value,
    }
    
    await updateConstraint.mutateAsync({
      id: editingConstraint.id,
      name: editFormData.name,
      config: updatedConfig,
      description: editFormData.description,
      isRequired: editFormData.isRequired,
    })
    
    setEditingConstraint(null)
  }

  // Check if constraint is editable (vertical_sum types)
  const isEditable = (type: string) => {
    return ['vertical_sum', 'compound_attribute_vertical_sum', 'attribute_vertical_sum'].includes(type)
  }

  // Filter constraints by shift type: show GLOBAL (null) + matching shiftType
  const filteredConstraints = useMemo(() => {
    if (!constraints) return []
    return constraints.filter((c: any) => 
      c.shiftType === null || c.shiftType === shiftType
    )
  }, [constraints, shiftType])

  // Helper to render scope badge
  const renderScopeBadge = (constraintShiftType: string | null | undefined) => {
    if (!constraintShiftType) {
      return (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
          <Globe className="h-3 w-3 mr-1" />
          Global
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
        <Target className="h-3 w-3 mr-1" />
        {constraintShiftType}
      </Badge>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
              <span>Active Constraints</span>
              <Badge variant="secondary" className="text-xs ml-2">
                {shiftType === ShiftType.APN ? 'A/P/N' : '7E'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {filteredConstraints.length}
              </Badge>
              <ChevronDown 
                className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
              />
            </CollapsibleTrigger>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Rule
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFormType('point')}>
                  Day Off (Point)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFormType('vertical_sum')}>
                  Min/Max Workers (Sum)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFormType('ai')}>
                  🤖 Natural Language (AI)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardTitle>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
        {/* Add Constraint Form */}
        {formType && (
          <AddConstraintForm
            type={formType}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        )}

        {/* Constraints List */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : filteredConstraints.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No constraints for {shiftType} shift type. Click "Add Rule" to create a constraint.
          </p>
        ) : (
          <div className="max-h-[300px] overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scope</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConstraints.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {renderScopeBadge(c.shiftType)}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${c.isRequired !== false ? 'text-green-600' : 'text-yellow-600'}`}>
                        {c.isRequired !== false ? 'Y' : 'N'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.type === 'point' ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {c.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.config?.operator && c.config?.value !== undefined ? (
                        <Badge variant="outline" className="text-xs font-mono">
                          {c.config.operator}{c.config.value}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="font-medium break-words">{c.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {c.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isEditable(c.type) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditClick(c)}
                            className="shrink-0"
                            aria-label="Edit Constraint"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteConstraint.mutate(c.id)}
                          disabled={deleteConstraint.isPending}
                          className="shrink-0"
                          aria-label="Delete Constraint"
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
        </CollapsibleContent>
      </Card>

      {/* Edit Constraint Dialog */}
      <Dialog open={!!editingConstraint} onOpenChange={(open) => !open && setEditingConstraint(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Constraint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-operator">Operator</Label>
                <Select
                  value={editFormData.operator}
                  onValueChange={(val) => setEditFormData({ ...editFormData, operator: val })}
                >
                  <SelectTrigger id="edit-operator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">=">{'>='} At least</SelectItem>
                    <SelectItem value="<=">{'<='} At most</SelectItem>
                    <SelectItem value="==">== Exactly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-value">Value</Label>
                <Input
                  id="edit-value"
                  type="number"
                  min="0"
                  value={editFormData.value}
                  onChange={(e) => setEditFormData({ ...editFormData, value: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="edit-required" className="text-sm font-medium">
                  Constraint Type
                </Label>
                <p className="text-xs text-muted-foreground">
                  {editFormData.isRequired 
                    ? 'Hard constraint - must be satisfied' 
                    : 'Soft constraint - can be relaxed with penalty'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={editFormData.isRequired ? 'default' : 'secondary'}
                  className={`text-xs ${editFormData.isRequired ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}
                >
                  {editFormData.isRequired ? 'Hard' : 'Soft'}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditFormData({ ...editFormData, isRequired: !editFormData.isRequired })}
                >
                  Toggle
                </Button>
              </div>
            </div>

            {editingConstraint?.config && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                <strong>Target State:</strong> {editingConstraint.config.target_state} | 
                <strong> Time Slot:</strong> {editingConstraint.config.time_slot}
                {editingConstraint.config.attribute_filters && (
                  <div>
                    <strong>Filters:</strong> {JSON.stringify(editingConstraint.config.attribute_filters)}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConstraint(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateConstraint.isPending}>
              {updateConstraint.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  )
}
