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
import { Plus, Trash2, ChevronDown, Globe, Target } from 'lucide-react'
import { useConstraints, useDeleteConstraint } from '../hooks/use-constraints'
import { AddConstraintForm } from './add-constraint-form'

type ConstraintType = 'point' | 'vertical_sum' | 'ai' | null

interface ConstraintBuilderProps {
  shiftType: 'APN' | 'DAY_NIGHT'
}

export function ConstraintBuilder({ shiftType }: ConstraintBuilderProps) {
  const { data: constraints, isLoading } = useConstraints()
  const deleteConstraint = useDeleteConstraint()
  const [formType, setFormType] = useState<ConstraintType>(null)
  const [isOpen, setIsOpen] = useState(true)

  const handleCancel = () => setFormType(null)
  const handleSuccess = () => setFormType(null)

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
                {shiftType === 'APN' ? 'A/P/N' : 'Day/Night'}
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
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
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
                      <Badge
                        variant={c.type === 'point' ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {c.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.priority > 0 ? (
                        <Badge variant="outline" className="text-xs">
                          P{c.priority}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="font-medium break-words">{c.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {c.description || '-'}
                    </TableCell>
                    <TableCell>
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
    </Collapsible>
  )
}
