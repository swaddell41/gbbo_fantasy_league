import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { broadcastToSeason } from '@/app/api/events/route'

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

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/user/picks - Starting request')
    
    const session = await getServerSession(authOptions)
    console.log('Session:', session ? 'Found' : 'Not found')
    
    if (!session || !session.user || session.user.isAdmin) {
      console.log('Unauthorized - no session, user, or admin user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Request body:', body)
    
    const { seasonId, picks } = body

    if (!seasonId || !picks || !Array.isArray(picks)) {
      console.log('Bad request - missing required fields')
      return NextResponse.json(
        { error: 'Season ID and picks array are required' },
        { status: 400 }
      )
    }

    console.log('Processing picks for user:', session.user.id, 'season:', seasonId)

    // Verify season exists
    const season = await prisma.season.findUnique({
      where: { id: seasonId }
    })

    if (!season) {
      console.log('Season not found:', seasonId)
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      )
    }

    // Delete existing picks for the same episode and pick types
    if (picks[0]?.pickType === 'FINALIST') {
      console.log('Deleting existing finalist picks for user:', session.user.id)
      await prisma.pick.deleteMany({
        where: {
          userId: session.user.id,
          seasonId,
          pickType: 'FINALIST'
        }
      })
    } else if (picks[0]?.episodeId) {
      // For weekly picks, delete existing picks for the same episode
      console.log('Deleting existing weekly picks for episode:', picks[0].episodeId)
      await prisma.pick.deleteMany({
        where: {
          userId: session.user.id,
          seasonId,
          episodeId: picks[0].episodeId,
          pickType: {
            in: ['STAR_BAKER', 'ELIMINATION']
          }
        }
      })
    }

    // Create new picks
    const createdPicks = []
    for (const pick of picks) {
      console.log('Creating pick:', pick)
      
      const createdPick = await prisma.pick.create({
        data: {
          userId: session.user.id,
          contestantId: pick.contestantId,
          seasonId,
          pickType: pick.pickType,
          episodeId: pick.episodeId || null
        },
        include: {
          contestant: true
        }
      })
      createdPicks.push(createdPick)
    }

    console.log('Successfully created picks:', createdPicks.length)
    
    // Broadcast update to all connected clients
    try {
      broadcastToSeason('picks_updated', {
        userId: session.user.id,
        userName: session.user.name,
        picks: createdPicks,
        episodeId: picks[0]?.episodeId
      }, seasonId)
    } catch (broadcastError) {
      console.error('Error broadcasting update:', broadcastError)
      // Don't fail the request if broadcast fails
    }
    
    return NextResponse.json(createdPicks, { status: 201 })
  } catch (error) {
    console.error('Error creating user picks:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
