import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      // Admin-only account: not a player, lands on /admin
      isAdmin: boolean
      // May use the admin tools (admin-only accounts + ADMIN_EMAILS players)
      canAdmin: boolean
      mustChangePassword: boolean
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    isAdmin: boolean
    mustChangePassword: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isAdmin: boolean
    mustChangePassword: boolean
  }
}
