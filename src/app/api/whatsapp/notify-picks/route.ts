import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { episodeId, seasonId } = await request.json()

    if (!episodeId || !seasonId) {
      return NextResponse.json({ error: 'Episode ID and Season ID are required' }, { status: 400 })
    }

    // Get episode details
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        season: true
      }
    })

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    // Get all picks for this episode
    const picks = await prisma.pick.findMany({
      where: {
        episodeId: episodeId,
        pickType: {
          in: ['STAR_BAKER', 'ELIMINATION']
        }
      },
      include: {
        contestant: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      }
    })

    // Group picks by user
    const picksByUser = new Map<string, { name: string; starBaker?: string; elimination?: string }>()
    
    picks.forEach(pick => {
      if (!picksByUser.has(pick.userId)) {
        picksByUser.set(pick.userId, { name: pick.user.name || 'Unknown' })
      }
      
      const userPicks = picksByUser.get(pick.userId)!
      if (pick.pickType === 'STAR_BAKER') {
        userPicks.starBaker = pick.contestant.name
      } else if (pick.pickType === 'ELIMINATION') {
        userPicks.elimination = pick.contestant.name
      }
    })

    // Format message for WhatsApp
    let message = `🍰 *GBBO Fantasy League - ${episode.title}*\n\n`
    message += `All picks are in! Here's what everyone picked:\n\n`

    picksByUser.forEach((userPicks, userId) => {
      message += `*${userPicks.name}:*\n`
      message += `⭐ Star Baker: ${userPicks.starBaker || 'Not picked'}\n`
      message += `❌ Elimination: ${userPicks.elimination || 'Not picked'}\n\n`
    })

    message += `Good luck everyone! 🍰✨`

    // For now, we'll just return the formatted message
    // In a real implementation, you would send this to WhatsApp API
    console.log('WhatsApp message:', message)

    return NextResponse.json({ 
      success: true, 
      message: 'Picks notification prepared',
      formattedMessage: message
    })
  } catch (error) {
    console.error('Error preparing WhatsApp notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Function to actually send to WhatsApp (you'll need to implement this with WhatsApp Business API)
async function sendToWhatsApp(message: string, groupId: string) {
  // This is where you would integrate with WhatsApp Business API
  // For now, we'll just log the message
  console.log(`Sending to WhatsApp group ${groupId}:`, message)
  
  // Example implementation:
  // const response = await fetch(`https://graph.facebook.com/v17.0/${groupId}/messages`, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     messaging_product: 'whatsapp',
  //     to: groupId,
  //     type: 'text',
  //     text: { body: message }
  //   })
  // })
  
  return { success: true }
}
