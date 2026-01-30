"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
if (!process.env.DISCORD_TOKEN)
    throw new Error("Missing DISCORD_TOKEN");
// Client ID will be fetched dynamically from the logged-in client
exports.config = {
    discordToken: process.env.DISCORD_TOKEN,
    databaseUrl: process.env.DATABASE_URL
};
