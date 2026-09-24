import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeSeasonScores } from '@/lib/leaderboard'

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

    const [picks, { pickPoints }] = await Promise.all([
      prisma.pick.findMany({
        where: { userId, seasonId },
        include: {
          contestant: { select: { id: true, name: true, imageUrl: true } },
          episode: { select: { id: true, title: true, episodeNumber: true, isCompleted: true } }
        },
        orderBy: [{ pickType: 'asc' }, { episode: { episodeNumber: 'asc' } }]
      }),
      computeSeasonScores(seasonId)
    ])

    type Episode = { id: string; title: string; episodeNumber: number; isCompleted: boolean }
    const toEntry = (pick: (typeof picks)[number]) => ({
      id: pick.id,
      pickType: pick.pickType,
      contestant: pick.contestant,
      // null until the episode (or, for finalists, the final) is scored
      points: pickPoints.get(pick.id) ?? null
    })

    const finalistPicks = picks.filter(pick => pick.pickType === 'FINALIST')
    const picksByEpisode = new Map<string, { episode: Episode; picks: ReturnType<typeof toEntry>[] }>()

    for (const pick of picks) {
      if (pick.pickType === 'FINALIST' || !pick.episode) continue
      const group = picksByEpisode.get(pick.episode.id) ?? { episode: pick.episode, picks: [] }
      group.picks.push(toEntry(pick))
      picksByEpisode.set(pick.episode.id, group)
    }

    const allPicks = [...picksByEpisode.values()]
    if (finalistPicks.length > 0) {
      allPicks.unshift({
        episode: { id: 'finalist', title: 'Finalist Picks', episodeNumber: 0, isCompleted: true },
        picks: finalistPicks.map(toEntry)
      })
    }

    return NextResponse.json({
      success: true,
      pickHistory: allPicks
    })
  } catch (error) {
    console.error('Error fetching pick history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
