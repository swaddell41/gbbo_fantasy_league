import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPlayerHistory } from '@/lib/leaderboard'

// Any player's finalists and picks for completed episodes (userId=me for yourself)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('seasonId')
    const userIdParam = searchParams.get('userId')
    if (!seasonId || !userIdParam) {
      return NextResponse.json({ error: 'Season ID and user ID are required' }, { status: 400 })
    }

    const history = await getPlayerHistory(seasonId, userIdParam === 'me' ? session.user.id : userIdParam)
    if (!history) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching player history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
