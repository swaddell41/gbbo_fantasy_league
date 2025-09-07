import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { episodeId, type, contestantId } = await request.json()

    if (!episodeId || !type || !contestantId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type === 'technical_challenge') {
      // Update the episode's technical challenge winner
      await prisma.episode.update({
        where: { id: episodeId },
        data: { technicalChallengeWinnerId: contestantId }
      })
    } else if (type === 'handshake') {
      // Create a handshake record
      await prisma.episodeHandshake.create({
        data: {
          episodeId,
          contestantId
        }
      })
    } else if (type === 'soggy_bottom') {
      // Create a soggy bottom record
      await prisma.episodeSoggyBottom.create({
        data: {
          episodeId,
          contestantId
        }
      })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving bonus points:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { episodeId, type, contestantId } = await request.json()

    if (!episodeId || !type || !contestantId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type === 'handshake') {
      // Delete all handshake records for this contestant in this episode
      await prisma.episodeHandshake.deleteMany({
        where: {
          episodeId,
          contestantId
        }
      })
    } else if (type === 'soggy_bottom') {
      // Delete all soggy bottom records for this contestant in this episode
      await prisma.episodeSoggyBottom.deleteMany({
        where: {
          episodeId,
          contestantId
        }
      })
    } else {
      return NextResponse.json({ error: 'Invalid type for deletion' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bonus points:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}