import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'

// Demo user for local development (when no database is configured)
const DEMO_USER = {
  id: '1',
  email: 'admin@example.com',
  name: 'Admin User',
  password: 'admin123',
  role: 'admin',
  permissions: ['read', 'write', 'delete', 'admin'],
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Check if database is configured
        const isDatabaseConfigured = !!process.env.DATABASE_URL

        if (!isDatabaseConfigured) {
          // Demo mode: use hardcoded credentials
          if (
            credentials.email === DEMO_USER.email &&
            credentials.password === DEMO_USER.password
          ) {
            return {
              id: DEMO_USER.id,
              email: DEMO_USER.email,
              name: DEMO_USER.name,
              role: DEMO_USER.role,
              permissions: DEMO_USER.permissions,
            }
          }
          return null
        }

        // Production mode: use database
        try {
          const { sql } = await import('@vercel/postgres')
          const result = await sql`
            SELECT id, email, name, password_hash, role, permissions
            FROM users
            WHERE email = ${credentials.email}
          `

          if (result.rows.length === 0) {
            return null
          }

          const user = result.rows[0]
          const isPasswordValid = await compare(credentials.password, user.password_hash)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.permissions = user.permissions
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.permissions = token.permissions as string[]
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60, // 30 minutes
  },
  secret: process.env.NEXTAUTH_SECRET,
}
