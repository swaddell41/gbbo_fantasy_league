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
  pickType: 'FINALIST' | 'STAR_BAKER' | 'ELIMINATION' | 'WINNER'
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

    // Picks lock once submitted: finalists once all three are in, weekly picks
    // once both Star Baker and going-home are in, the final once the winner
    // pick is in. Only an admin can reset them.
    const isFinalists = picks[0]?.pickType === 'FINALIST'
    const episodeId = isFinalists ? null : picks[0]?.episodeId
    if (!isFinalists && !episodeId) {
      return NextResponse.json({ error: 'Episode ID is required for weekly picks' }, { status: 400 })
    }

    let isWinnerPick = false
    if (episodeId) {
      const episode = await prisma.episode.findUnique({ where: { id: episodeId }, select: { seasonId: true, isFinal: true } })
      if (!episode || episode.seasonId !== seasonId) {
        return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
      }
      // The final takes exactly one pick: the series winner
      isWinnerPick = episode.isFinal
      const valid = isWinnerPick
        ? picks.length === 1 && picks[0].pickType === 'WINNER'
        : picks.every(p => p.pickType === 'STAR_BAKER' || p.pickType === 'ELIMINATION')
      if (!valid) {
        return NextResponse.json(
          { error: isWinnerPick ? 'The final only takes a winner pick' : 'Weekly picks are Star Baker and going home' },
          { status: 400 }
        )
      }
    }

    const scope = isFinalists
      ? { userId, seasonId, pickType: 'FINALIST' as const }
      : isWinnerPick
        ? { userId, seasonId, episodeId, pickType: 'WINNER' as const }
        : { userId, seasonId, episodeId, pickType: { in: ['STAR_BAKER' as const, 'ELIMINATION' as const] } }

    const createdPicks = await prisma.$transaction(async tx => {
      const existing = await tx.pick.count({ where: scope })
      if (existing >= (isFinalists ? 3 : isWinnerPick ? 1 : 2)) return null

      // Clear any incomplete set before saving the full one
      await tx.pick.deleteMany({ where: scope })

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

    if (!createdPicks) {
      return NextResponse.json(
        { error: 'These picks are locked in. Ask the admin if something needs fixing.' },
        { status: 409 }
      )
    }
    return NextResponse.json(createdPicks, { status: 201 })
  } catch (error) {
    console.error('Error creating user picks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
