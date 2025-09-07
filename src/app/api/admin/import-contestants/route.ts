import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Contestant data from the GBBO 2025 page
// Using local images from the public/contestants directory
const GBBO_2025_CONTESTANTS = [
  {
    name: "Aaron",
    bio: "Aaron lives in London with his boyfriend Anthony, having moved from Manchester two years ago. He is a passionate baker who fuses French patisserie with Caribbean flair. Always experimenting, he's currently embracing Asian flavours like miso and yuzu in his mono-portion bakes. After a long day of application planning at work, Aaron channels his creative side into baking, sewing and making his own liqueurs such as amaretto and limoncello. Known as the \"King of Hobbies,\" when he isn't baking, he's cycling around the city, teaching himself French, lifting weights at the gym, or studying for a Master's in Computer Science and Data Analytics.",
    imageUrl: "/contestants/aaron.jpg"
  },
  {
    name: "Hassan",
    bio: "Chemistry graduate Hassan lives with his mum in South Yorkshire. He works in the pharmaceutical industry, testing new drugs in their development stages. As a scientist, Hassan takes an analytical approach to baking, researching processes thoroughly before getting started on a new recipe. He is always looking to learn about new flavours and gaining new skills. With a love for sweet treats inspired by his Pakistani heritage, he's especially fond of praline and nut-based flavours that echo traditional Asian sweets. Outside the lab and kitchen, he's a dedicated gamer, gym-goer, and meets regularly for a quiz with his mates.",
    imageUrl: "/contestants/hassan.jpg"
  },
  {
    name: "Iain",
    bio: "Originally from Coleraine, Iain lives in Belfast with his girlfriend Dervla and their cat, Viktor. A former amateur powerlifter Iain now lifts dough instead of weights. The self-proclaimed \"Yeastie Boy\" mixes his love of live music with sourdough, immortalising album cover art on the crusts of his loaves. He blends classic flavours with a creative twist, often using fermented fruits and vegetables to enhance the depth and complexity of his flavours. If an ingredient can be pickled, aged, or cultured, he's eager to give it a try! Iain is also on a mission to rewrite the Bake Off legacy of \"Iain from Belfast\" once and for all.",
    imageUrl: "/contestants/iain.jpg"
  },
  {
    name: "Jasmine",
    bio: "Born and raised in Edinburgh, Jasmine now lives with her cousins in London while she completes her medical degree. She learnt the basics of bread and cakes through her Mum and aunts, and has fond memories of batch baking for big family get togethers during holidays in the Scottish Highlands. Baking has become her creative outlet, and she likes nothing better than using fresh, seasonal ingredients to create classic flavour combinations. When she's not in hospital placements, Jasmine's likely sea swimming, running half marathons or playing hockey for her university team.",
    imageUrl: "/contestants/jasmine.jpg"
  },
  {
    name: "Jessika",
    bio: "With backflips as bold as her bakes, Jessika is a gymnastic, roller-skating Drag King whose creations are as vibrant as her personality. Gifting bakes is her love language, and she'll spend months gathering information about her friends tastes before surprising them with the perfect birthday entremet. Raised in Cornwall, Jessika has fond memories of eating corner-shop cakes with her sister after dance classes, which solidified her sweet tooth. Her signature bakes fuse daring flavours like salted mango caramel and cardamom, or Jerusalem artichoke caramel with a dark chocolate mousse. When she's not baking, Jessika's on skates, cycling, or performing as her drag king persona. An ambitious baker, she's all about pushing boundaries, in the kitchen and beyond.",
    imageUrl: "/contestants/jessika.jpg"
  },
  {
    name: "Leighton",
    bio: "With a mathematical mind, Leighton is guided in both life and baking by the approach that 'anything can be done with a formula'. Originally from Swansea, proud Welshman Leighton has always done things his own way, ignoring anyone that told him 'boys don't bake'! He grew up playing the organ at his local church and now lives in Surrey with his Californian husband Eric and their Irish Terrier, Cilla. Leighton plays tennis four times a week, supports several animal charities, and is usually found belting Les Mis while baking (much to his neighbours' dismay!). He likes to play with traditional Welsh/British and American flavours, with favourites like Welsh cakes with peanut butter and Victoria Sponge with key lime pie filling.",
    imageUrl: "/contestants/leighton.jpg"
  },
  {
    name: "Lesley",
    bio: "Lesley's been a hairdresser for 45 years and the clients that come to her salon always expect a lovely slice of cake along with their trim. Despite a love for classic old-school bakes, it's never the 'same old' with her modern and fun designs. Lesley has high hopes for her Granddaughter Mabel, who she expects to be able to do a curly blow-dry and bake a batch of cookies by the time she is 5. Living with her partner Mark and two dogs, Norman and Marley, Lesley loves birdwatching, gardening and a seaside walk followed by fish and chips. She's been baking since the age of 10, inspired by Nanny Mable and Auntie Joan, who taught her the basics and sparked a lifelong passion. For her, baking is all about comfort, creativity and making people smile, especially when it's served with a cuppa and a chat.",
    imageUrl: "/contestants/lesley.jpg"
  },
  {
    name: "Nadia",
    bio: "Blending Indian and Italian flavours with Scouse spirit, Nadia is a chatterbox bringing warmth and laughter into to every room whether it's her home salon, the dance floor, or the kitchen! Inspired by her Italian chef dad, she brings rustic charm and soulful flavours to everything she bakes. Nadia lives in a lively Liverpool home with her partner Daniel and daughters Rosa-Bella and Maria. Sundays are sacred \"feast days,\" filled with homemade pasta, roasts, and always a pud. A hairdresser, baker, and former personal trainer, Nadia channels her endless energy into novelty cakes, creative twists on classics, and kitchen dance breaks. For her, baking is all about heart, heritage, and keeping joy at the centre of it all.",
    imageUrl: "/contestants/nadia.jpg"
  },
  {
    name: "Nataliia",
    bio: "Born in Ukraine, Nataliia was taught to bake by her grandmother, following traditional recipes that have been handed down through the generations. She loves to use these recipes to this day and also infuses classic British bakes with flavours inspired by her roots such as honey, poppy seeds and spices like nutmeg and cinnamon. Nataliia moved to the UK with her husband Harry four years ago, just before the war broke out. Her family followed shortly after as refugees and they now all live in East Yorkshire with their 3 year old daughter, Francesca. An economics graduate with an artistic streak, Nataliia loves painting, running, and countryside walks with her Ukrainian rescue dog Aria.",
    imageUrl: "/contestants/nataliia.jpg"
  },
  {
    name: "Pui Man",
    bio: "From runways and veils to ovens and scales, perfectionist Pui Man brings the attention to detail of designing a wedding dress to each of her bakes. Born in Hong Kong and now living in Essex with her husband and two children, Pui Man rediscovered baking during lockdown and hasn't looked back. Her bakes are as beautiful as they are bold, and she practices endlessly to make sure her creations are as close to perfection as possible. Always thinking of others, Pui Man volunteers three evenings a week, collecting surplus food from supermarkets and distributing it within her community. When she does find time for herself, you'll find her knitting with a pint, in the pub with her friend. While the other bakers may dream of a Hollywood handshake, Pui Man's got her eye on the show's first ever Hollywood hug.",
    imageUrl: "/contestants/pui-man.jpg"
  },
  {
    name: "Toby",
    bio: "Toby is a country boy at heart and grew up in the seaside town of Sidmouth with his three siblings. Currently three years in to his \"six month\" home DIY renovation project, Toby and his girlfriend Syd now live in Warwickshire with their rescue dog Bex. Working for a fitness start-up, he is often out and about at events and meeting potential clients. He has a blue belt in Brazilian Jiu Jitsu and his training partner loves refuelling after a gruelling session on the mats with his strawberry cheesecake. Toby takes a stripped-back, healthy approach to baking, and tends to lean more towards classic recipes and flavours as he believes they are classics for a reason! But it's bread that is his real passion, baking something different every day.",
    imageUrl: "/contestants/toby.jpg"
  },
  {
    name: "Tom",
    bio: "Tom grew up in London and learnt to bake scones and flapjacks alongside his Mum and Danish Granny. As a teen, Tom feared his secret love of baking would out him. Now, a member of two queer sports teams and with a boyfriend of three years, the game may be up. Having stepped back from the advertising agency he set up, he's recently reconnected with his first love, food, and brings a creative flair to his beautifully presented bakes. Tom grew up in a food obsessed family and when not working you can find him fishing for Sea Bass with his brother, foraging for mushrooms and cooking roasts with his dad.",
    imageUrl: "/contestants/tom.jpg"
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
    
    if (source === 'gbbo-2025') {
      contestantsToImport = GBBO_2025_CONTESTANTS
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
