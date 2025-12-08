import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MoveLeft } from 'lucide-react';
import { NotFoundIllustration } from '@/components/not-found-illustration';

export default function NotFound() {
  return (
    <div className='h-screen w-full flex flex-col items-center justify-center bg-background p-4'>
      <div className='flex flex-col items-center text-center space-y-8 max-w-md'>
        <div className='w-full max-w-[300px] aspect-[4/3]'>
          <NotFoundIllustration className='w-full h-full' />
        </div>

        <div className='space-y-2'>
          <h1 className='text-4xl font-bold tracking-tighter sm:text-5xl'>Page not found</h1>
          <p className='text-muted-foreground text-lg'>
            Sorry, we couldn't find the page you're looking for. It might have been moved or
            deleted.
          </p>
        </div>

        <div className='flex gap-4'>
          <Button asChild variant='default' size='lg'>
            <Link href='/'>
              <MoveLeft className='mr-2 h-4 w-4' />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>

      <div className='absolute bottom-8 text-center text-sm text-muted-foreground'>
        <p>&copy; {new Date().getFullYear()} Orto AI. All rights reserved.</p>
      </div>
    </div>
  );
}
