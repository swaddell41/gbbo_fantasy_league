import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('seasonId')
    
    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    const episodes = await prisma.episode.findMany({
      where: { seasonId },
      include: {
        starBaker: true,
        eliminated: true
      },
      orderBy: { episodeNumber: 'asc' }
    })

    return NextResponse.json(episodes)
  } catch (error) {
    console.error('Error fetching episodes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
