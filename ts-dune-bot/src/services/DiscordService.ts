import {
    Client,
    Guild,
    ChannelType,
    CategoryChannel,
    TextChannel,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";

export class DiscordService {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    private async getGuild(guildId: string): Promise<Guild> {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) throw new Error(`Guild ${guildId} not found`);
        return guild;
    }

    async createGameChannels(guildId: string, gameId: number, gameName: string) {
        const guild = await this.getGuild(guildId);

        // 1. Create Category
        const category = await guild.channels.create({
            name: `${gameName} [${gameId}]`,
            type: ChannelType.GuildCategory
        });

        // 2. Create Channels
        const actionsChannel = await guild.channels.create({
            name: "actions",
            type: ChannelType.GuildText,
            parent: category.id
        });

        const mapChannel = await guild.channels.create({
            name: "map",
            type: ChannelType.GuildText,
            parent: category.id
        });

        const talkChannel = await guild.channels.create({
            name: "table-talk",
            type: ChannelType.GuildText,
            parent: category.id
        });

        return {
            categoryId: category.id,
            actionsId: actionsChannel.id,
            mapId: mapChannel.id,
            talkId: talkChannel.id
        };
    }

    async deleteGameChannels(guildId: string, categoryId: string) {
        const guild = await this.getGuild(guildId);

        const category = guild.channels.cache.get(categoryId) as CategoryChannel;
        if (!category) return; // Already deleted?

        // Delete children first
        const children = category.children.cache;
        for (const [_, channel] of children) {
            await channel.delete().catch(() => { });
        }

        // Delete category
        await category.delete().catch(() => { });
    }

    async sendActionMessage(
        guildId: string,
        channelId: string,
        content: string,
        buttons: { label: string, customId: string, style: 'Primary' | 'Secondary' | 'Success' | 'Danger' }[]
    ): Promise<string> {
        const guild = await this.getGuild(guildId);
        const channel = guild.channels.cache.get(channelId) as TextChannel;

        if (!channel) throw new Error("Channel not found");

        const row = new ActionRowBuilder<ButtonBuilder>();

        buttons.forEach(btn => {
            const style = ButtonStyle[btn.style];
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(btn.customId)
                    .setLabel(btn.label)
                    .setStyle(style)
            );
        });

        const message = await channel.send({
            content: content,
            components: buttons.length > 0 ? [row] : []
        });

        return message.id;
    }
}
