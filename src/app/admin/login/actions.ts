'use server'

import { signIn } from '@/auth'
import { AuthError } from 'next-auth'

export async function loginAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const identifier = (formData.get('identifier') as string) ?? ''
  const password = (formData.get('password') as string) ?? ''
  const callbackUrl = (formData.get('callbackUrl') as string) || '/admin'

  try {
    await signIn('credentials', { identifier, password, redirectTo: callbackUrl })
  } catch (err) {
    // Next.js redirect() throws a special error — re-throw so the redirect happens
    if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    if (err instanceof AuthError) {
      return { error: 'Invalid email or password' }
    }
    return { error: 'Something went wrong — please try again' }
  }
  return null
}
