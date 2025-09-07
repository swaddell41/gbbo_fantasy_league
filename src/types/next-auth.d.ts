import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      isAdmin: boolean
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
