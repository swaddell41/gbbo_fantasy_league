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
      return NextResponse.json(
        { error: 'Season ID is required' },
        { status: 400 }
      )
    }

    const contestants = await prisma.contestant.findMany({
      where: { seasonId },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(contestants)
  } catch (error) {
    console.error('Error fetching contestants:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, imageUrl, bio, seasonId } = await request.json()

    if (!name || !seasonId) {
      return NextResponse.json(
        { error: 'Name and season ID are required' },
        { status: 400 }
      )
    }

    // Check if contestant with this name already exists in the season
    const existingContestant = await prisma.contestant.findFirst({
      where: {
        name,
        seasonId
      }
    })

    if (existingContestant) {
      return NextResponse.json(
        { error: 'A contestant with this name already exists in this season' },
        { status: 400 }
      )
    }

    const contestant = await prisma.contestant.create({
      data: {
        name,
        imageUrl: imageUrl || null,
        bio: bio || null,
        seasonId,
        isEliminated: false
      }
    })

    return NextResponse.json(contestant, { status: 201 })
  } catch (error) {
    console.error('Error creating contestant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user.isAdmin) {
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

    // Delete all contestants for the season
    await prisma.contestant.deleteMany({
      where: { seasonId }
    })

    return NextResponse.json({ message: 'All contestants deleted successfully' })
  } catch (error) {
    console.error('Error deleting contestants:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
