import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStarBakerCounts } from '@/lib/starBakerCounts'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('seasonId')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    const counts = await getStarBakerCounts(session.user.id, seasonId)

    return NextResponse.json({ counts })
  } catch (error) {
    console.error('Error fetching star baker counts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
