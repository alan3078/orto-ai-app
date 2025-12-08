'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface StaffGroup {
  id: string;
  name: string;
  description?: string | null;
  memberCount: number;
  isActive?: boolean;
}

async function fetchStaffGroups(): Promise<StaffGroup[]> {
  const res = await fetch('/api/staff-groups');
  if (!res.ok) throw new Error('Failed to load staff groups');
  return res.json();
}

interface StaffGroupSelectorProps {
  onSelect?: (group: StaffGroup | null) => void;
  value?: string | null;
}

export function StaffGroupSelector({ onSelect, value }: StaffGroupSelectorProps) {
  const { data: groups, isLoading } = useQuery({
    queryKey: ['staff-groups'],
    queryFn: fetchStaffGroups,
  });
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(value || null);

  const filtered = useMemo(() => {
    if (!groups) return [];
    const q = query.toLowerCase();
    return groups.filter(
      (g) => g.name.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)
    );
  }, [groups, query]);

  function handleSelect(id: string) {
    const newId = id === selectedId ? null : id;
    setSelectedId(newId);
    if (onSelect) {
      const group = groups?.find((g) => g.id === newId) || null;
      onSelect(group);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex justify-between items-center'>
          <span>Select Staff Group</span>
          <Input
            placeholder='Search groups...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className='h-8 w-44'
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-2'>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className='h-10 w-full' />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className='text-sm text-muted-foreground text-center py-8'>No staff groups found.</p>
        ) : (
          <div className='max-h-[300px] overflow-y-auto border rounded-md'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Members</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((g) => {
                  const active = g.id === selectedId;
                  return (
                    <TableRow
                      key={g.id}
                      onClick={() => handleSelect(g.id)}
                      className={active ? 'bg-muted cursor-pointer' : 'cursor-pointer'}
                    >
                      <TableCell className='font-medium flex items-center gap-2'>
                        {g.name}
                        {g.isActive && <Badge variant='secondary'>Active</Badge>}
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground max-w-[200px] truncate'>
                        {g.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline' className='gap-1'>
                          <Users className='h-3 w-3' />
                          {g.memberCount}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StaffGroupSelector;
