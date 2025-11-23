"use client"

import { useState } from 'react'
import Link from 'next/link'
import { LookupModal } from '@/components/ui/lookup-modal'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

async function getStaffGroups() {
  const res = await fetch('/api/staff-groups')
  if (!res.ok) throw new Error('Failed to load groups')
  return res.json()
}

async function getStaff() {
  const res = await fetch('/api/staff')
  if (!res.ok) throw new Error('Failed to load staff')
  return res.json()
}

export default function StaffGroupsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: groups, isLoading } = useQuery({
    queryKey: ['staff-groups'],
    queryFn: getStaffGroups,
  })
  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: getStaff,
  })

  const filteredGroups = groups?.filter((group: { name: string; description: string }) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Groups</h1>
          <p className="text-muted-foreground">Organize staff into teams and departments</p>
        </div>
        <Link href="/staff-groups/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Group
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No groups found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGroups.map((group: { 
                    id: string
                    name: string
                    description: string
                    memberCount: number
                  }) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>{group.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" />
                          {group.memberCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/staff-groups/${group.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" onClick={() => { setTargetGroupId(group.id); setShowAddMembers(true) }}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <LookupModal
        open={showAddMembers}
        title="Add Staff to Group"
        multiple
        items={staff?.map((s: any) => ({ id: s.id, name: s.name, email: s.email }))}
        isLoading={staffLoading}
        onClose={() => { setShowAddMembers(false); setTargetGroupId(null) }}
        onSelect={async (items) => {
          if (!targetGroupId || items.length === 0) return
          try {
            await fetch(`/api/staff-groups/${targetGroupId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ addStaffIds: items.map(i => i.id) }),
            })
            queryClient.invalidateQueries({ queryKey: ['staff-groups'] })
          } catch (e) {
            console.error(e)
          }
        }}
      />
    </div>
  )
}
