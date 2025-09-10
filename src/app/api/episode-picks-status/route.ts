import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const episodeId = searchParams.get('episodeId')

    if (!episodeId) {
      return NextResponse.json({ error: 'Episode ID is required' }, { status: 400 })
    }

    // Get the episode
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        season: true
      }
    })

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    // Get all non-admin users who have picks in this season
    const users = await prisma.user.findMany({
      where: {
        isAdmin: false,
        picks: {
          some: {
            seasonId: episode.seasonId
          }
        }
      },
      select: {
        id: true,
        name: true
      }
    })

    // Get picks for this episode
    const episodePicks = await prisma.pick.findMany({
      where: {
        episodeId: episodeId,
        pickType: {
          in: ['STAR_BAKER', 'ELIMINATION']
        }
      },
      select: {
        userId: true,
        pickType: true
      }
    })

    // Check which users have submitted both Star Baker and Elimination picks
    const usersWithCompletePicks = new Set<string>()
    const userPickCounts = new Map<string, Set<string>>()

    episodePicks.forEach(pick => {
      if (!userPickCounts.has(pick.userId)) {
        userPickCounts.set(pick.userId, new Set())
      }
      userPickCounts.get(pick.userId)!.add(pick.pickType)
    })

    userPickCounts.forEach((pickTypes, userId) => {
      if (pickTypes.has('STAR_BAKER') && pickTypes.has('ELIMINATION')) {
        usersWithCompletePicks.add(userId)
      }
    })

    const allUsersSubmitted = users.every(user => usersWithCompletePicks.has(user.id))
    const submittedCount = usersWithCompletePicks.size
    const totalCount = users.length

    return NextResponse.json({
      episodeId,
      allUsersSubmitted,
      submittedCount,
      totalCount,
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        hasSubmitted: usersWithCompletePicks.has(user.id)
      }))
    })
  } catch (error) {
    console.error('Error checking episode picks status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
