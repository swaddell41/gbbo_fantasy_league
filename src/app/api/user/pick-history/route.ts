import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const seasonId = searchParams.get('seasonId')

    if (!userId || !seasonId) {
      return NextResponse.json({ error: 'User ID and Season ID are required' }, { status: 400 })
    }

    // Get all picks for the user in the season
    const picks = await prisma.pick.findMany({
      where: {
        userId: userId,
        seasonId: seasonId
      },
      include: {
        contestant: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        },
        episode: {
          select: {
            id: true,
            title: true,
            episodeNumber: true,
            isCompleted: true
          }
        }
      },
      orderBy: [
        { episode: { episodeNumber: 'asc' } },
        { pickType: 'asc' }
      ]
    })

    // Group picks by episode
    const picksByEpisode = new Map<string, {
      episode: {
        id: string
        title: string
        episodeNumber: number
        isCompleted: boolean
      }
      picks: Array<{
        id: string
        pickType: string
        contestant: {
          id: string
          name: string
          imageUrl?: string
        }
      }>
    }>()

    picks.forEach(pick => {
      const episodeId = pick.episode.id
      if (!picksByEpisode.has(episodeId)) {
        picksByEpisode.set(episodeId, {
          episode: pick.episode,
          picks: []
        })
      }
      
      picksByEpisode.get(episodeId)!.picks.push({
        id: pick.id,
        pickType: pick.pickType,
        contestant: pick.contestant
      })
    })

    return NextResponse.json({
      success: true,
      pickHistory: Array.from(picksByEpisode.values())
    })
  } catch (error) {
    console.error('Error fetching pick history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
