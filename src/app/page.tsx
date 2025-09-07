'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (session) {
      if (session.user.isAdmin) {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            🧁 GBBO Fantasy League 🧁
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Welcome to the Great British Bake Off Fantasy League! Pick your favorite bakers, 
            make your weekly predictions, and compete with friends to see who has the best taste in baking talent.
          </p>
          
          <div className="space-y-4">
            <Link
              href="/auth/signin"
              className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors duration-200 mr-4"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="inline-block bg-white hover:bg-gray-50 text-amber-600 font-bold py-4 px-8 rounded-lg text-lg border-2 border-amber-600 transition-colors duration-200"
            >
              Join the League
            </Link>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">👨‍🍳</div>
              <h3 className="text-xl font-semibold mb-2">Pick Your Bakers</h3>
              <p className="text-gray-600">
                Choose your favorite contestants each week and predict who will shine in the tent.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold mb-2">Compete & Win</h3>
              <p className="text-gray-600">
                Earn points for correct predictions and compete with your friends for the top spot.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2">Play with Friends</h3>
              <p className="text-gray-600">
                Create a private league with your friends and family for the ultimate GBBO experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}