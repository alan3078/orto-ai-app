'use client';

import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginAction } from '@/app/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const urlError = searchParams.get('error');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {(error || urlError) && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            {error ||
              (urlError === 'CredentialsSignin'
                ? 'Invalid username or password'
                : 'An error occurred')}
          </AlertDescription>
        </Alert>
      )}

      <div className='space-y-2'>
        <Label htmlFor='username'>Username / Email</Label>
        <Input
          id='username'
          name='username'
          type='text'
          autoComplete='username'
          required
          placeholder='Enter your username'
          disabled={isPending}
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='password'>Password</Label>
        <Input
          id='password'
          name='password'
          type='password'
          autoComplete='current-password'
          required
          placeholder='Enter your password'
          disabled={isPending}
        />
      </div>

      {callbackUrl && <input type='hidden' name='callbackUrl' value={callbackUrl} />}

      <Button type='submit' className='w-full' disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  );
}
