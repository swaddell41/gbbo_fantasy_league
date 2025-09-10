import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('seasonId')
    const episodeId = searchParams.get('episodeId')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    // Get all users for the season (excluding admins)
    const users = await prisma.user.findMany({
      where: {
        isAdmin: false,
        picks: {
          some: {
            seasonId: seasonId
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    // Get all picks for the season
    const picks = await prisma.pick.findMany({
      where: {
        seasonId: seasonId,
        ...(episodeId && { episodeId: episodeId })
      },
      include: {
        contestant: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Group picks by user
    const picksByUser = users.map(user => {
      const userPicks = picks.filter(pick => pick.userId === user.id)
      
      return {
        user: {
          id: user.id,
          name: user.name
        },
        finalistPicks: userPicks
          .filter(pick => pick.pickType === 'FINALIST')
          .map(pick => ({
            id: pick.id,
            contestant: pick.contestant
          })),
        weeklyPicks: userPicks
          .filter(pick => pick.pickType === 'STAR_BAKER' || pick.pickType === 'ELIMINATION')
          .map(pick => ({
            id: pick.id,
            episodeId: pick.episodeId,
            pickType: pick.pickType,
            contestant: pick.contestant
          }))
      }
    })

    return NextResponse.json({ picksByUser })
  } catch (error) {
    console.error('Error fetching public picks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
