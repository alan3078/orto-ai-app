import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  const session = await auth()
  
  // Redirect if already logged in
  if (session?.user) {
    redirect('/admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Universal Scheduler
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Nurse Edition
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Sign in to your account
          </h2>
          <LoginForm />
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Contact your administrator if you need access.
        </p>
      </div>
    </div>
  )
}
