'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

type Item = {
  id: string;
  name: string;
  description?: string | null;
  email?: string | null;
};

interface LookupModalProps {
  open: boolean;
  title?: string;
  multiple?: boolean;
  onClose: () => void;
  onSelect: (items: Item[]) => void;
  items: Item[] | undefined;
  isLoading?: boolean;
  columns?: {
    key: keyof Item | 'select';
    label: string;
    widthClass?: string;
  }[];
}

export function LookupModal({
  open,
  title = 'Select Items',
  multiple = true,
  onClose,
  onSelect,
  items,
  isLoading = false,
  columns,
}: LookupModalProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description?.toLowerCase().includes(q) ?? false) ||
        (i.email?.toLowerCase().includes(q) ?? false)
    );
  }, [items, query]);

  function toggle(id: string) {
    if (!multiple) {
      setSelected({ [id]: true });
      return;
    }
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleConfirm() {
    const chosen = filtered.filter((f) => selected[f.id]);
    onSelect(chosen);
    onClose();
  }

  function handleSingleSelect(id: string) {
    if (multiple) return;
    const item = filtered.find((f) => f.id === id);
    if (item) {
      onSelect([item]);
      onClose();
    }
  }

  const cols =
    columns && columns.length > 0
      ? columns
      : ([
          multiple ? { key: 'select' as const, label: '', widthClass: 'w-8' } : null,
          { key: 'name' as const, label: 'Name' },
          { key: 'email' as const, label: 'Email' },
          { key: 'description' as const, label: 'Description' },
        ].filter(Boolean) as {
          key: keyof Item | 'select';
          label: string;
          widthClass?: string;
        }[]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className='w-full max-w-xl sm:max-w-2xl lg:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <Input placeholder='Search...' value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className='h-64 border rounded-md overflow-y-auto'>
            {isLoading ? (
              <div className='p-4 space-y-2'>
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className='p-4 text-sm text-muted-foreground'>No results</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {cols.map((c) => (
                      <TableHead key={c.key} className={c.widthClass}>
                        {c.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const checked = !!selected[item.id];
                    return (
                      <TableRow
                        key={item.id}
                        className={multiple && checked ? 'data-[state=selected]:bg-muted' : ''}
                        onClick={() => (multiple ? toggle(item.id) : handleSingleSelect(item.id))}
                      >
                        {cols.map((c) => (
                          <TableCell key={c.key}>
                            {c.key === 'select' && multiple ? (
                              <input
                                type='checkbox'
                                checked={checked}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => toggle(item.id)}
                                aria-label={`Select ${item.name}`}
                              />
                            ) : c.key === 'name' ? (
                              item.name
                            ) : c.key === 'email' ? (
                              item.email || ''
                            ) : c.key === 'description' ? (
                              item.description || ''
                            ) : (
                              ''
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          {multiple && (
            <Button onClick={handleConfirm} disabled={Object.values(selected).every((v) => !v)}>
              Add Selected
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LookupModal;
