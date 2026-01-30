"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordService = void 0;
const discord_js_1 = require("discord.js");
class DiscordService {
    client;
    constructor(client) {
        this.client = client;
    }
    async getGuild(guildId) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild)
            throw new Error(`Guild ${guildId} not found`);
        return guild;
    }
    async createGameChannels(guildId, gameId, gameName) {
        const guild = await this.getGuild(guildId);
        // 1. Create Category
        const category = await guild.channels.create({
            name: `${gameName} [${gameId}]`,
            type: discord_js_1.ChannelType.GuildCategory
        });
        // 2. Create Channels
        const actionsChannel = await guild.channels.create({
            name: "actions",
            type: discord_js_1.ChannelType.GuildText,
            parent: category.id
        });
        const mapChannel = await guild.channels.create({
            name: "map",
            type: discord_js_1.ChannelType.GuildText,
            parent: category.id
        });
        const talkChannel = await guild.channels.create({
            name: "table-talk",
            type: discord_js_1.ChannelType.GuildText,
            parent: category.id
        });
        return {
            categoryId: category.id,
            actionsId: actionsChannel.id,
            mapId: mapChannel.id,
            talkId: talkChannel.id
        };
    }
    async deleteGameChannels(guildId, categoryId) {
        const guild = await this.getGuild(guildId);
        const category = guild.channels.cache.get(categoryId);
        if (!category)
            return; // Already deleted?
        // Delete children first
        const children = category.children.cache;
        for (const [_, channel] of children) {
            await channel.delete().catch(() => { });
        }
        // Delete category
        await category.delete().catch(() => { });
    }
    async sendActionMessage(guildId, channelId, content, buttons) {
        const guild = await this.getGuild(guildId);
        const channel = guild.channels.cache.get(channelId);
        if (!channel)
            throw new Error("Channel not found");
        const row = new discord_js_1.ActionRowBuilder();
        buttons.forEach(btn => {
            const style = discord_js_1.ButtonStyle[btn.style];
            row.addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId(btn.customId)
                .setLabel(btn.label)
                .setStyle(style));
        });
        const message = await channel.send({
            content: content,
            components: buttons.length > 0 ? [row] : []
        });
        return message.id;
    }
}
exports.DiscordService = DiscordService;
