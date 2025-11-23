"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { LookupModal } from '@/components/ui/lookup-modal'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'

export default function EditUserGroupPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [showLookup, setShowLookup] = useState(false)
  const [members, setMembers] = useState<any[]>([])

  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const res = await fetch('/api/staff')
      if (!res.ok) throw new Error('Failed to load staff')
      return res.json()
    },
  })

  useEffect(() => {
    async function loadGroup() {
      try {
        const res = await fetch(`/api/staff-groups/${params.id}`)
        if (!res.ok) throw new Error('Failed to load group')
        const data = await res.json()
        setFormData({ name: data.name, description: data.description || '' })
        setMembers(data.staff || [])
      } catch (error) {
        console.error('Failed to load group:', error)
        toast.error('Failed to load group')
        router.push('/staff-groups')
      } finally {
        setIsLoading(false)
      }
    }

    loadGroup()
  }, [params.id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const res = await fetch(`/api/staff-groups/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed to update group')
      toast.success('Group updated successfully')
      router.push('/staff-groups')
    } catch (error) {
      console.error('Failed to update group:', error)
      toast.error('Failed to update group')
    } finally {
      setIsSaving(false)
    }
  }

  async function addMembers(newMembers: any[]) {
    try {
      const res = await fetch(`/api/staff-groups/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addStaffIds: newMembers.map(m => m.id) }),
      })
      if (!res.ok) throw new Error('Failed to add members')
      const updated = await res.json()
      setMembers(updated.staff || [])
      toast.success('Members added')
    } catch (e) {
      console.error(e)
      toast.error('Failed adding members')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/staff-groups">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Groups
          </Button>
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Edit Group</h1>
        <p className="text-muted-foreground">Update group information</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nursing Team A"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Morning shift nurses"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Link href="/staff-groups">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
              <div className="pt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Members ({members.length})</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowLookup(true)}>Add Members</Button>
                </div>
                <div className="border rounded-md max-h-64 overflow-y-auto">
                  {members.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">No members yet</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map(m => (
                          <TableRow key={m.id}>
                            <TableCell>{m.name}</TableCell>
                            <TableCell>{m.email || ''}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/staff-groups/${params.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ removeStaffIds: [m.id] }),
                                    })
                                    if (!res.ok) throw new Error('Failed to remove')
                                    const updated = await res.json()
                                    setMembers(updated.staff || [])
                                    toast.success('Member removed')
                                  } catch (e) {
                                    console.error(e)
                                    toast.error('Remove failed')
                                  }
                                }}
                              >Remove</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
      <LookupModal
        open={showLookup}
        title="Select Staff"
        multiple
        items={staff?.map((s: any) => ({ id: s.id, name: s.name, email: s.email }))}
        isLoading={staffLoading}
        onClose={() => setShowLookup(false)}
        onSelect={(items) => addMembers(items)}
      />
    </div>
  )
}
