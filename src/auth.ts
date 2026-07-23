import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { roleCapabilities } from '@/lib/auth/capabilities'
import type { UserRole } from '@prisma/client'

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { identifier, password } = parsed.data
        const isEmail = identifier.includes('@')

        const user = await prisma.user.findFirst({
          where: isEmail
            ? { email: identifier }
            : { OR: [{ username: identifier }, { email: identifier }] },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            capabilities: true,
            isActive: true,
          },
        })

        if (!user || !user.isActive || !user.passwordHash) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          capabilities: (user.capabilities as Record<string, boolean>) ?? {},
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: UserRole }).role
        token.capabilities = (user as { capabilities: unknown }).capabilities
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as UserRole
      session.user.capabilities = token.capabilities as Record<string, boolean>
      return session
    },
  },
})

// Extend next-auth types
declare module 'next-auth' {
  interface User {
    role: UserRole
    capabilities: Record<string, boolean>
  }
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: UserRole
      capabilities: Record<string, boolean>
    }
  }
}

// JWT augmentation is handled through next-auth's JWT type
// next-auth/jwt is not a direct module to augment in NextAuth v5

export { roleCapabilities }
