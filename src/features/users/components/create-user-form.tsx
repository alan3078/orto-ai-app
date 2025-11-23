'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useCreateUser } from '../hooks/use-users'

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
})

type CreateUserFormValues = z.infer<typeof createUserSchema>

export function CreateUserForm() {
  const createUser = useCreateUser()

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      name: '',
    },
  })

  const onSubmit = async (data: CreateUserFormValues) => {
    try {
      await createUser.mutateAsync(data)
      form.reset()
    } catch (error) {
      console.error('Failed to create user:', error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  disabled={createUser.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name (optional)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="John Doe"
                  disabled={createUser.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={createUser.isPending}>
          {createUser.isPending ? 'Adding...' : 'Add User'}
        </Button>
        {createUser.isError && (
          <p className="text-sm text-red-500">
            Error: {createUser.error.message}
          </p>
        )}
      </form>
    </Form>
  )
}
