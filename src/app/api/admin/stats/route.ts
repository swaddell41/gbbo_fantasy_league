import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get total counts
    const [
      totalSeasons,
      totalContestants,
      totalEpisodes,
      totalUsers,
      totalPicks,
      completedEpisodes
    ] = await Promise.all([
      prisma.season.count(),
      prisma.contestant.count(),
      prisma.episode.count(),
      prisma.user.count({ where: { isAdmin: false } }), // Exclude admin users
      prisma.pick.count(),
      prisma.episode.count({ where: { isCompleted: true } })
    ])

    // Get the most recent season as "active"
    const activeSeason = await prisma.season.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            contestants: true,
            episodes: true
          }
        }
      }
    })

    const stats = {
      totalSeasons,
      totalContestants,
      totalEpisodes,
      totalUsers,
      totalPicks,
      completedEpisodes,
      activeSeason: activeSeason ? {
        name: activeSeason.name,
        year: activeSeason.year,
        contestantCount: activeSeason._count.contestants,
        episodeCount: activeSeason._count.episodes
      } : null
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
