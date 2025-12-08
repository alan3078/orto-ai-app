'use client';

import { useState, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { translateConstraintAction } from '@/app/actions/ai-constraint.action';
import { constraintKeys } from '../services/dashboard.service';
import { toast } from 'sonner';

interface AIConstraintBuilderProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AIConstraintBuilder({ onSuccess, onCancel }: AIConstraintBuilderProps) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{
    raw: string;
    constraints: Array<{
      id?: string;
      type: string;
      name: string;
      config?: unknown;
    }>;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleTranslate = () => {
    startTransition(async () => {
      try {
        setResult(null);
        const res = await translateConstraintAction({ text: input });
        if (!res.success) {
          toast.error(res.error || 'Translation failed');
          return;
        }
        // Invalidate constraints cache to refresh the list
        await queryClient.invalidateQueries({ queryKey: constraintKeys.all });
        toast.success(`Created ${res.constraints.length} constraint(s)`);
        setResult({ raw: res.raw || '', constraints: res.constraints });
        onSuccess();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  };

  return (
    <Card className='border-2 border-primary'>
      <CardHeader>
        <CardTitle className='text-base'>🤖 Natural Language Constraint</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        <textarea
          placeholder='e.g., Alice needs 2 days off after 5 work days'
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          className='min-h-[120px] w-full rounded-md border border-input bg-transparent p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        />
        <div className='flex gap-2 justify-end'>
          <Button variant='outline' size='sm' onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button size='sm' onClick={handleTranslate} disabled={isPending || !input.trim()}>
            {isPending ? 'Translating...' : 'Generate'}
          </Button>
        </div>
        {result && (
          <div className='space-y-2 pt-2'>
            {result.constraints.map((c) => (
              <div key={c.name} className='rounded border p-2 text-sm flex items-start gap-2'>
                <Badge variant='secondary'>{c.type}</Badge>
                <span className='font-medium'>{c.name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
