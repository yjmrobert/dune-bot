"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordService = void 0;
const discord_js_1 = require("discord.js");
const MapRenderer_1 = require("../engine/MapRenderer");
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
    async sendGameView(guildId, channelId, view) {
        const guild = await this.getGuild(guildId);
        const channel = guild.channels.cache.get(channelId);
        if (!channel)
            throw new Error("Channel not found");
        const components = [];
        if (view.buttons.length > 0) {
            const row = new discord_js_1.ActionRowBuilder();
            view.buttons.forEach(btn => {
                const style = discord_js_1.ButtonStyle[btn.style] || discord_js_1.ButtonStyle.Primary;
                const customId = `${btn.command.type}${btn.command.target ? ':' + btn.command.target : ''}${btn.command.value ? ':' + btn.command.value : ''}`;
                row.addComponents(new discord_js_1.ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(btn.label)
                    .setStyle(style)
                    .setDisabled(btn.disabled ?? false));
            });
            components.push(row);
        }
        const message = await channel.send({
            content: view.content || "",
            // Embeds not fully implemented in GameView -> Discord mapping yet but placeholder:
            // embeds: view.embed ? [view.embed] : [],
            components: components
        });
        return message.id;
    }
    async sendImageView(guildId, channelId, view) {
        const guild = await this.getGuild(guildId);
        const channel = guild.channels.cache.get(channelId);
        if (!channel)
            throw new Error("Channel not found");
        // Convert ImageView to Buffer
        const renderer = new MapRenderer_1.MapRenderer();
        const buffer = await renderer.render(view);
        const attachment = new discord_js_1.AttachmentBuilder(buffer, { name: 'map.png' });
        const message = await channel.send({
            files: [attachment]
        });
        return message.id;
    }
    async editMessage(guildId, channelId, messageId, content) {
        // TODO: Refactor this to take GameView as well if we want full consistency
        const guild = await this.getGuild(guildId);
        const channel = guild.channels.cache.get(channelId);
        if (!channel)
            throw new Error("Channel not found");
        try {
            const message = await channel.messages.fetch(messageId);
            if (!message)
                throw new Error("Message not found");
            await message.edit(content);
        }
        catch (e) {
            console.error(`Failed to edit message ${messageId}:`, e);
            // Don't throw, just log, as this is often non-critical (message might be deleted)
        }
    }
}
exports.DiscordService = DiscordService;
