import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Contestant data from the GBBO 2025 page
// Using local images from the public/contestants directory
// Series 17 (2026) — https://thegreatbritishbakeoff.co.uk/meet-the-class-of-2026/
const GBBO_2026_CONTESTANTS = [
  {
    name: "Clara",
    bio: "Hertfordshire — Portuguese-born marketer who bakes bright, playful designs with fresh fruity flavours and Portuguese classics.",
    imageUrl: "/contestants/clara.jpg"
  },
  {
    name: "Connie",
    bio: "London — NHS veteran known as \"the Cake Lady\", famous for hearty carrot cakes and rum-soaked fruit cakes.",
    imageUrl: "/contestants/connie.jpg"
  },
  {
    name: "Danni",
    bio: "Dorset — Experimental forager who pairs wild finds with flavours like ube and red bean, with video-game-inspired decoration.",
    imageUrl: "/contestants/danni.jpg"
  },
  {
    name: "Gabe",
    bio: "West Midlands — Birmingham drag performer and costume designer with a \"gorgeous but homemade\" style and a meringue obsession.",
    imageUrl: "/contestants/gabe.jpg"
  },
  {
    name: "Gary",
    bio: "Nottinghamshire — Methodical smallholder who took up baking five years ago; precise presentation and bold citrus flavours.",
    imageUrl: "/contestants/gary.jpg"
  },
  {
    name: "Mo",
    bio: "West Midlands — Law student who went from mug cakes to polished bakes blending Asian flavours with British classics.",
    imageUrl: "/contestants/mo.jpg"
  },
  {
    name: "Molly",
    bio: "London — Traditional baker taught by her grandmother; loves hazelnut, fruit and mint, and never misses an F1 race.",
    imageUrl: "/contestants/molly.jpg"
  },
  {
    name: "Moyin",
    bio: "Essex — County-champion sprinter mastering macarons since 14, with flavours drawn from his Nigerian heritage.",
    imageUrl: "/contestants/moyin.jpg"
  },
  {
    name: "Nikki",
    bio: "London — Colourful baker who treats baking as therapy, soundtracked by R&B or classical depending on the bake.",
    imageUrl: "/contestants/nikki.jpg"
  },
  {
    name: "Shannon",
    bio: "Gloucestershire — Nature-loving countryside baker aiming for whimsical, rustic \"forest magic\" in the Tent.",
    imageUrl: "/contestants/shannon.jpg"
  },
  {
    name: "Tom",
    bio: "West Yorkshire — Self-proclaimed northern diva and hairdresser whose bakes are witty, pretty and delicious.",
    imageUrl: "/contestants/tom.jpg"
  },
  {
    name: "Yannis",
    bio: "London — NICU worker born in Vienna, mixing Bangladeshi and Austrian influences — and a legendary bhangra dancer.",
    imageUrl: "/contestants/yannis.jpg"
  }
]

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId, source } = await request.json()

    if (!seasonId) {
      return NextResponse.json(
        { error: 'Season ID is required' },
        { status: 400 }
      )
    }

    // Verify season exists
    const season = await prisma.season.findUnique({
      where: { id: seasonId }
    })

    if (!season) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      )
    }

    // Check if contestants already exist for this season
    const existingContestants = await prisma.contestant.findMany({
      where: { seasonId }
    })

    if (existingContestants.length > 0) {
      return NextResponse.json(
        { error: 'Contestants already exist for this season. Please delete existing contestants first.' },
        { status: 400 }
      )
    }

    // Import contestants based on source
    let contestantsToImport = []
    
    if (source === 'gbbo-2026') {
      contestantsToImport = GBBO_2026_CONTESTANTS
    } else {
      return NextResponse.json(
        { error: 'Invalid source' },
        { status: 400 }
      )
    }

    // Create contestants in database
    const createdContestants = []
    for (const contestantData of contestantsToImport) {
      const contestant = await prisma.contestant.create({
        data: {
          name: contestantData.name,
          bio: contestantData.bio,
          imageUrl: contestantData.imageUrl,
          seasonId,
          isEliminated: false
        }
      })
      createdContestants.push(contestant)
    }

    return NextResponse.json({
      message: `Successfully imported ${createdContestants.length} contestants`,
      contestants: createdContestants
    })

  } catch (error) {
    console.error('Error importing contestants:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
