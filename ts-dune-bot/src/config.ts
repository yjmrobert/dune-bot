import "dotenv/config";

if (!process.env.DISCORD_TOKEN) throw new Error("Missing DISCORD_TOKEN");

// Client ID will be fetched dynamically from the logged-in client
export const config = {
    discordToken: process.env.DISCORD_TOKEN,
    databaseUrl: process.env.DATABASE_URL
};
