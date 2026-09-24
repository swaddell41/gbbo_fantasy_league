import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('seasonId')

    if (!seasonId) {
      return NextResponse.json(
        { error: 'Season ID is required' },
        { status: 400 }
      )
    }

    const picks = await prisma.pick.findMany({
      where: {
        userId: session.user.id,
        seasonId
      },
      include: {
        contestant: true
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(picks)
  } catch (error) {
    console.error('Error fetching user picks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface PickInput {
  contestantId: string
  pickType: 'FINALIST' | 'STAR_BAKER' | 'ELIMINATION'
  episodeId?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId, picks } = (await request.json()) as { seasonId?: string; picks?: PickInput[] }
    if (!seasonId || !picks || !Array.isArray(picks)) {
      return NextResponse.json(
        { error: 'Season ID and picks array are required' },
        { status: 400 }
      )
    }

    const season = await prisma.season.findUnique({ where: { id: seasonId } })
    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    const userId = session.user.id

    // Replace the existing picks of the same kind in one transaction
    const createdPicks = await prisma.$transaction(async tx => {
      if (picks[0]?.pickType === 'FINALIST') {
        await tx.pick.deleteMany({ where: { userId, seasonId, pickType: 'FINALIST' } })
      } else if (picks[0]?.episodeId) {
        await tx.pick.deleteMany({
          where: {
            userId,
            seasonId,
            episodeId: picks[0].episodeId,
            pickType: { in: ['STAR_BAKER', 'ELIMINATION'] }
          }
        })
      }

      return Promise.all(
        picks.map(pick =>
          tx.pick.create({
            data: {
              userId,
              contestantId: pick.contestantId,
              seasonId,
              pickType: pick.pickType,
              episodeId: pick.episodeId || null
            },
            include: { contestant: true }
          })
        )
      )
    })

    return NextResponse.json(createdPicks, { status: 201 })
  } catch (error) {
    console.error('Error creating user picks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
