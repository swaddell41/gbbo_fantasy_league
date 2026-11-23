// Seeds a throwaway LOCAL database with a test league that's ready for the final:
// 12 bakers, 9 scored weeks, 3 bakers left, and an open final episode.
// Wipes the database first, so it refuses to run against anything but the
// local test database created by scripts/run-local-test.sh.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const url = process.env.DATABASE_URL ?? ''
if (!/@localhost[:/].*\/gbbo_fantasy_local\b/.test(url)) {
  console.error('Refusing to seed: DATABASE_URL is not the local gbbo_fantasy_local database.')
  process.exit(1)
}

const prisma = new PrismaClient()
const PASSWORD = 'test1234'

const BAKERS = ['Clara', 'Connie', 'Danni', 'Gabe', 'Gary', 'Mo', 'Molly', 'Moyin', 'Nikki', 'Shannon', 'Tom', 'Yannis']
// One goes home each week; Gabe, Moyin and Nikki reach the final
const OUT = ['Tom', 'Clara', 'Gary', 'Mo', 'Shannon', 'Yannis', 'Connie', 'Molly', 'Danni']
const STAR = ['Nikki', 'Moyin', 'Gabe', 'Danni', 'Nikki', 'Molly', 'Moyin', 'Gabe', 'Nikki']
const PLAYERS = [
  { name: 'Ava', email: 'ava@test.local' },
  { name: 'Ben', email: 'ben@test.local' },
  { name: 'Cleo', email: 'cleo@test.local' },
]

async function main() {
  // Clear everything (children first)
  await prisma.pick.deleteMany()
  await prisma.episodeHandshake.deleteMany()
  await prisma.episodeSoggyBottom.deleteMany()
  await prisma.episode.deleteMany()
  await prisma.contestant.deleteMany()
  await prisma.season.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  const password = await bcrypt.hash(PASSWORD, 10)
  await prisma.user.create({ data: { email: 'admin@test.local', name: 'Admin', password, isAdmin: true } })
  const players = []
  for (const p of PLAYERS) players.push(await prisma.user.create({ data: { ...p, password } }))

  const season = await prisma.season.create({ data: { name: 'Test Series', year: 2026, isActive: true } })
  const baker = {}
  for (const name of BAKERS) {
    const c = await prisma.contestant.create({
      data: {
        name,
        imageUrl: `/contestants/${name.toLowerCase()}.jpg`,
        seasonId: season.id,
        isEliminated: OUT.includes(name),
        isFinalist: !OUT.includes(name),
      },
    })
    baker[name] = c.id
  }

  // Finalist picks: Ava 3/3, Ben 2/3, Cleo 1/3
  const finalistPicks = [
    ['Nikki', 'Moyin', 'Gabe'],
    ['Nikki', 'Moyin', 'Danni'],
    ['Nikki', 'Molly', 'Danni'],
  ]
  for (const [i, names] of finalistPicks.entries()) {
    for (const name of names) {
      await prisma.pick.create({
        data: { userId: players[i].id, contestantId: baker[name], seasonId: season.id, pickType: 'FINALIST' },
      })
    }
  }

  const start = new Date('2026-09-23T20:00:00Z')
  for (let week = 0; week < OUT.length; week++) {
    const ep = await prisma.episode.create({
      data: {
        title: `Week ${week + 1}`,
        episodeNumber: week + 1,
        seasonId: season.id,
        airDate: new Date(start.getTime() + week * 7 * 864e5),
        isCompleted: true,
        starBakerId: baker[STAR[week]],
        eliminatedId: baker[OUT[week]],
      },
    })
    // Still in the tent at the start of this week
    const inTent = BAKERS.filter(b => !OUT.slice(0, week).includes(b))
    for (const [i, player] of players.entries()) {
      // Deterministic spread of right and wrong guesses
      const sb = i === 0 ? STAR[week] : inTent[(week + i * 3) % inTent.length]
      let el = i === 1 ? OUT[week] : inTent[(week * 2 + i + 1) % inTent.length]
      if (el === sb) el = inTent[(inTent.indexOf(sb) + 1) % inTent.length]
      await prisma.pick.createMany({
        data: [
          { userId: player.id, contestantId: baker[sb], episodeId: ep.id, seasonId: season.id, pickType: 'STAR_BAKER' },
          { userId: player.id, contestantId: baker[el], episodeId: ep.id, seasonId: season.id, pickType: 'ELIMINATION' },
        ],
      })
    }
  }

  await prisma.episode.create({
    data: {
      title: 'The Final',
      episodeNumber: OUT.length + 1,
      seasonId: season.id,
      airDate: new Date(start.getTime() + OUT.length * 7 * 864e5),
      isActive: true,
      isFinal: true,
    },
  })

  console.log('\nSeeded the test league. Everyone\'s password is', PASSWORD)
  console.log('  Admin:   admin@test.local')
  console.log('  Players:', PLAYERS.map(p => p.email).join(', '))
  console.log('The final (episode 10) is open for winner picks.\n')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
