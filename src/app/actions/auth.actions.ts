'use server';

import { signIn, signOut } from '@/lib/auth';
import { ROUTES } from '@/lib/routes';
import { AuthError } from 'next-auth';

export async function loginAction(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Username and password are required' };
  }

  try {
    await signIn('credentials', {
      username,
      password,
      redirectTo: ROUTES.ADMIN.HOME,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid username or password' };
        default:
          return { error: 'Something went wrong' };
      }
    }
    // Re-throw redirect errors
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: ROUTES.AUTH.LOGIN });
}
