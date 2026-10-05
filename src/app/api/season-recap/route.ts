import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRecap, getSeasonSummary } from '@/lib/leaderboard'

// Season progress ("after 3 bakes · 9 bakers left") and last week's recap
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const seasonId = new URL(request.url).searchParams.get('seasonId')
    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    const [summary, recap] = await Promise.all([getSeasonSummary(seasonId), getRecap(seasonId)])
    return NextResponse.json({ summary, recap })
  } catch (error) {
    console.error('Error fetching season recap:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
