import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const cards = [
    // WEAPONS - PROJECTILE (4)
    {
        name: "Maula Pistol",
        type: "Weapon - Projectile",
        description: "A projectile weapon. Kills opponent's leader unless they play a Shield.",
        isWeapon: true,
        isDefense: false,
        isSpecial: false
    },
    {
        name: "Crysknife",
        type: "Weapon - Projectile",
        description: "A projectile weapon (sacred blade). Kills opponent's leader unless they play a Shield.",
        isWeapon: true,
        isDefense: false,
        isSpecial: false
    },
    {
        name: "Stunner",
        type: "Weapon - Projectile",
        description: "A projectile weapon. Kills opponent's leader unless they play a Shield.",
        isWeapon: true,
        isDefense: false,
        isSpecial: false
    },
    {
        name: "Slip-Tip",
        type: "Weapon - Projectile",
        description: "A projectile weapon. Kills opponent's leader unless they play a Shield.",
        isWeapon: true,
        isDefense: false,
        isSpecial: false
    },

    // WEAPONS - POISON (4)
    {
        name: "Chaumas",
        type: "Weapon - Poison",
        description: "A poison weapon. Kills opponent's leader unless they play a Snooper.",
        isWeapon: true,
        isDefense: false,
        isSpecial: false
    },
    {
        name: "Chaumurky",
        type: "Weapon - Poison",
        description: "A poison weapon. Kills opponent's leader unless they play a Snooper.",
        isWeapon: true,
        isDefense: false,
        isSpecial: false
    },
    {
        name: "Ellaca Drug",
        type: "Weapon - Poison",
        description: "A poison weapon. Kills opponent's leader unless they play a Snooper.",
        isWeapon: true,
        isDefense: false,
        isSpecial: false
    },
    {
        name: "Gom Jabbar",
        type: "Weapon - Poison",
        description: "A specific poison needle. Kills opponent's leader unless they play a Snooper.",
        isWeapon: true,
        isDefense: false,
        isSpecial: false
    },

    // WEAPONS - LASGUN (1)
    {
        name: "Lasgun",
        type: "Weapon - Lasgun",
        description: "Special weapon. Kills opponent's leader. If a Shield is played in the same battle, an atomic explosion occurs.",
        isWeapon: true,
        isDefense: false,
        isSpecial: false
    },

    // DEFENSES - PROJECTILE (4 Shields)
    {
        name: "Shield #1",
        type: "Defense - Projectile",
        description: "Defense against Projectile weapons. Creates atomic explosion if hit by Lasgun.",
        isWeapon: false,
        isDefense: true,
        isSpecial: false
    },
    {
        name: "Shield #2",
        type: "Defense - Projectile",
        description: "Defense against Projectile weapons. Creates atomic explosion if hit by Lasgun.",
        isWeapon: false,
        isDefense: true,
        isSpecial: false
    },
    {
        name: "Shield #3",
        type: "Defense - Projectile",
        description: "Defense against Projectile weapons. Creates atomic explosion if hit by Lasgun.",
        isWeapon: false,
        isDefense: true,
        isSpecial: false
    },
    {
        name: "Shield #4",
        type: "Defense - Projectile",
        description: "Defense against Projectile weapons. Creates atomic explosion if hit by Lasgun.",
        isWeapon: false,
        isDefense: true,
        isSpecial: false
    },

    // DEFENSES - POISON (4 Snoopers)
    {
        name: "Snooper #1",
        type: "Defense - Poison",
        description: "Defense against Poison weapons.",
        isWeapon: false,
        isDefense: true,
        isSpecial: false
    },
    {
        name: "Snooper #2",
        type: "Defense - Poison",
        description: "Defense against Poison weapons.",
        isWeapon: false,
        isDefense: true,
        isSpecial: false
    },
    {
        name: "Snooper #3",
        type: "Defense - Poison",
        description: "Defense against Poison weapons.",
        isWeapon: false,
        isDefense: true,
        isSpecial: false
    },
    {
        name: "Snooper #4",
        type: "Defense - Poison",
        description: "Defense against Poison weapons.",
        isWeapon: false,
        isDefense: true,
        isSpecial: false
    },

    // SPECIAL - WORTHLESS (5)
    ...["Baliset", "Jubba Cloak", "Kulon", "La La La!", "Trip to Gamont"].map(name => ({
        name,
        type: "Special - Worthless",
        description: "Worthless card. Play as a weapon, defense, or both in battle with no effect.",
        isWeapon: false,
        isDefense: false,
        isSpecial: true
    })),

    // SPECIAL - UNIQUE (11)
    {
        name: "Family Atomics",
        type: "Special - Unique",
        description: "Play to destroy the Shield Wall. Forces on Shield Wall are destroyed.",
        isWeapon: false,
        isDefense: false,
        isSpecial: true
    },
    {
        name: "Weather Control",
        type: "Special - Unique",
        description: "Play during Storm phase to control the storm movement (0-10 sectors).",
        isWeapon: false,
        isDefense: false,
        isSpecial: true
    },
    {
        name: "Hajr",
        type: "Special - Unique",
        description: "Play during Movement to make an extra on-planet move.",
        isWeapon: false,
        isDefense: false,
        isSpecial: true
    },
    {
        name: "Tleilaxu Ghola",
        type: "Special - Unique",
        description: "Play to revive 1 leader or 5 forces from the tanks for free.",
        isWeapon: false,
        isDefense: false,
        isSpecial: true
    },
    {
        name: "Truthtrance #1",
        type: "Special - Unique",
        description: "Force a player to answer one Yes/No question truthfully.",
        isWeapon: false,
        isDefense: false,
        isSpecial: true
    },
    {
        name: "Truthtrance #2",
        type: "Special - Unique",
        description: "Force a player to answer one Yes/No question truthfully.",
        isWeapon: false,
        isDefense: false,
        isSpecial: true
    },
    {
        name: "Karama #1",
        type: "Special - Unique",
        description: "Use to activate special faction ability or cancel an opponent's advantage.",
        isWeapon: false,
        isDefense: false,
        isSpecial: true
    },
    {
        name: "Karama #2",
        type: "Special - Unique",
        description: "Use to activate special faction ability or cancel an opponent's advantage.",
        isWeapon: false,
        isDefense: false,
        isSpecial: true
    },
    {
        name: "Cheap Hero #1",
        type: "Special - Unique",
        description: "Play in battle as a leader with 0 strength. Discard after use.",
        isWeapon: false,
        isDefense: false,
        isSpecial: true
    },
    {
        name: "Cheap Hero #2",
        type: "Special - Unique",
        description: "Play in battle as a leader with 0 strength. Discard after use.",
        isWeapon: false,
        isDefense: false,
        isSpecial: true
    },
    {
        name: "Cheap Hero #3",
        type: "Special - Unique",
        description: "Play in battle as a leader with 0 strength. Discard after use.",
        isWeapon: false,
        isDefense: false,
        isSpecial: true
    }
];



const spiceCards = [
    { name: "Great Flat", type: "Territory", amount: 10, sector: 8 },
    { name: "Hagga Basin", type: "Territory", amount: 6, sector: 11 },
    { name: "Imperial Basin", type: "Territory", amount: 10, sector: 12 },
    { name: "Red Chasm", type: "Territory", amount: 8, sector: 7 },
    { name: "The Minor Erg", type: "Territory", amount: 8, sector: 9 },
    { name: "Cielago South", type: "Territory", amount: 6, sector: 15 },
    { name: "Cielago North", type: "Territory", amount: 6, sector: 16 },
    { name: "South Mesa", type: "Territory", amount: 10, sector: 2 },
    { name: "Shai-Hulud #1", type: "Shai-Hulud", amount: null, sector: null },
    { name: "Shai-Hulud #2", type: "Shai-Hulud", amount: null, sector: null },
    { name: "Shai-Hulud #3", type: "Shai-Hulud", amount: null, sector: null }
];

async function main() {
    console.log('Seeding Treachery Cards...');
    for (const card of cards) {
        await prisma.treacheryCard.upsert({
            where: { name: card.name },
            update: card,
            create: card,
        })
    }

    console.log('Seeding Spice Cards...');
    for (const card of spiceCards) {
        await prisma.spiceCard.upsert({
            where: { name: card.name },
            update: card,
            create: card,
        })
    }

    console.log('Seeding finished.');
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
