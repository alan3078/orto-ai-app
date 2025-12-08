'use client';

import { Bell, Search, LogOut, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from 'next-auth/react';
import { logoutAction } from '@/app/actions/auth.actions';

export function Header() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className='sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6'>
      <div className='flex-1'>
        <div className='relative max-w-md'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input placeholder='Search...' className='pl-9' />
        </div>
      </div>

      <Button variant='ghost' size='icon' className='relative'>
        <Bell className='h-5 w-5' />
        <span className='absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500' />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='relative'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium'>
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || (
                <User className='h-4 w-4' />
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-56'>
          <DropdownMenuLabel>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm font-medium'>{user?.name || 'User'}</p>
              <p className='text-xs text-muted-foreground'>{user?.email}</p>
              {user?.role && (
                <p className='text-xs text-muted-foreground flex items-center gap-1'>
                  <Shield className='h-3 w-3' />
                  {user.role}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <form action={logoutAction} className='w-full'>
              <button
                type='submit'
                className='flex w-full items-center gap-2 cursor-pointer text-red-600'
              >
                <LogOut className='h-4 w-4' />
                Sign out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
