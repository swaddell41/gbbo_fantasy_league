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

    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('seasonId')
    
    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    const episodes = await prisma.episode.findMany({
      where: { seasonId },
      include: {
        starBaker: true,
        eliminated: true,
        technicalChallengeWinner: true,
        handshakes: {
          include: {
            contestant: true
          }
        },
        soggyBottoms: {
          include: {
            contestant: true
          }
        }
      },
      orderBy: { episodeNumber: 'asc' }
    })

    return NextResponse.json(episodes)
  } catch (error) {
    console.error('Error fetching episodes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, episodeNumber, seasonId, airDate, isActive } = await request.json()

    if (!title || !episodeNumber || !seasonId || !airDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if episode number already exists for this season
    const existingEpisode = await prisma.episode.findFirst({
      where: { seasonId, episodeNumber }
    })

    if (existingEpisode) {
      return NextResponse.json({ error: 'Episode number already exists for this season' }, { status: 400 })
    }

    const episode = await prisma.episode.create({
      data: {
        title,
        episodeNumber: parseInt(episodeNumber),
        seasonId,
        airDate: new Date(airDate),
        isActive: isActive || false
      }
    })

    return NextResponse.json(episode, { status: 201 })
  } catch (error) {
    console.error('Error creating episode:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { episodeId, title, episodeNumber, seasonId, airDate, isActive } = await request.json()

    if (!episodeId || !title || !episodeNumber || !seasonId || !airDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const episode = await prisma.episode.update({
      where: { id: episodeId },
      data: {
        title,
        episodeNumber: parseInt(episodeNumber),
        airDate: new Date(airDate),
        isActive: isActive || false
      }
    })

    return NextResponse.json(episode)
  } catch (error) {
    console.error('Error updating episode:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { episodeId, isActive } = await request.json()

    if (!episodeId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Episode ID and isActive status are required' }, { status: 400 })
    }

    const episode = await prisma.episode.update({
      where: { id: episodeId },
      data: { isActive }
    })

    return NextResponse.json(episode)
  } catch (error) {
    console.error('Error updating episode:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const episodeId = searchParams.get('episodeId')
    
    if (!episodeId) {
      return NextResponse.json({ error: 'Episode ID is required' }, { status: 400 })
    }

    await prisma.episode.delete({ where: { id: episodeId } })

    return NextResponse.json({ message: 'Episode deleted successfully' })
  } catch (error) {
    console.error('Error deleting episode:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
