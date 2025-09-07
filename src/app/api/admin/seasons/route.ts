import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const seasons = await prisma.season.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(seasons)
  } catch (error) {
    console.error('Error fetching seasons:', error)
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

    const { name, year } = await request.json()

    if (!name || !year) {
      return NextResponse.json(
        { error: 'Name and year are required' },
        { status: 400 }
      )
    }

    // Check if a season with this name and year already exists
    const existingSeason = await prisma.season.findFirst({
      where: {
        name,
        year
      }
    })

    if (existingSeason) {
      return NextResponse.json(
        { error: 'A season with this name and year already exists' },
        { status: 400 }
      )
    }

    const season = await prisma.season.create({
      data: {
        name,
        year,
        isActive: false
      }
    })

    return NextResponse.json(season, { status: 201 })
  } catch (error) {
    console.error('Error creating season:', error)
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

    // Delete all contestants first (cascade delete)
    await prisma.contestant.deleteMany({
      where: { seasonId }
    })

    // Delete the season
    await prisma.season.delete({
      where: { id: seasonId }
    })

    return NextResponse.json({ message: 'Season and all contestants deleted successfully' })
  } catch (error) {
    console.error('Error deleting season:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
