import {
    Client,
    Guild,
    ChannelType,
    CategoryChannel,
    TextChannel,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} from "discord.js";
import { GameView } from "../domain/viewModels";
import { ImageView } from "../domain/imageViewModels";
import { MapRenderer } from "../engine/MapRenderer";

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

    private createComponents(view: GameView): ActionRowBuilder<ButtonBuilder>[] {
        const components: ActionRowBuilder<ButtonBuilder>[] = [];

        if (view.buttons.length > 0) {
            const row = new ActionRowBuilder<ButtonBuilder>();
            view.buttons.forEach(btn => {
                const style = ButtonStyle[btn.style as keyof typeof ButtonStyle] || ButtonStyle.Primary;
                const customId = `${btn.command.type}${btn.command.target ? ':' + btn.command.target : ''}${btn.command.value ? ':' + btn.command.value : ''}`;

                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(customId)
                        .setLabel(btn.label)
                        .setStyle(style)
                        .setDisabled(btn.disabled ?? false)
                );
            });
            components.push(row);
        }
        return components;
    }

    async sendGameView(
        guildId: string,
        channelId: string,
        view: GameView
    ): Promise<string> {
        const guild = await this.getGuild(guildId);
        const channel = guild.channels.cache.get(channelId) as TextChannel;

        if (!channel) throw new Error("Channel not found");

        const components = this.createComponents(view);

        const message = await channel.send({
            content: view.content || "",
            // Embeds not fully implemented in GameView -> Discord mapping yet but placeholder:
            // embeds: view.embed ? [view.embed] : [],
            components: components
        });

        return message.id;
    }

    async updateGameView(
        guildId: string,
        channelId: string,
        messageId: string,
        view: GameView
    ): Promise<void> {
        const guild = await this.getGuild(guildId);
        const channel = guild.channels.cache.get(channelId) as TextChannel;
        if (!channel) throw new Error("Channel not found");

        try {
            const message = await channel.messages.fetch(messageId);
            if (!message) throw new Error("Message not found");

            const components = this.createComponents(view);

            await message.edit({
                content: view.content || "",
                components: components
            });
        } catch (e) {
            console.error(`Failed to update game view message ${messageId}:`, e);
        }
    }

    async sendImageView(
        guildId: string,
        channelId: string,
        view: ImageView
    ): Promise<string> {
        const guild = await this.getGuild(guildId);
        const channel = guild.channels.cache.get(channelId) as TextChannel;

        if (!channel) throw new Error("Channel not found");

        // Convert ImageView to Buffer
        const renderer = new MapRenderer();
        const buffer = await renderer.render(view);
        const attachment = new AttachmentBuilder(buffer, { name: 'map.png' });

        const message = await channel.send({
            files: [attachment]
        });

        return message.id;
    }

    async updateImageView(
        guildId: string,
        channelId: string,
        messageId: string,
        view: ImageView
    ): Promise<string> {
        const guild = await this.getGuild(guildId);
        const channel = guild.channels.cache.get(channelId) as TextChannel;

        if (!channel) throw new Error("Channel not found");

        // Convert ImageView to Buffer
        const renderer = new MapRenderer();
        const buffer = await renderer.render(view);
        const attachment = new AttachmentBuilder(buffer, { name: 'map.png' });

        try {
            const message = await channel.messages.fetch(messageId);
            if (!message) throw new Error("Message not found");

            await message.edit({
                files: [attachment]
            });
            return message.id;
        } catch (e) {
            console.error(`Failed to update map view message ${messageId}:`, e);
            throw e;
        }
    }

    async editMessage(guildId: string, channelId: string, messageId: string, content: string) {
        // TODO: Refactor this to take GameView as well if we want full consistency
        const guild = await this.getGuild(guildId);
        const channel = guild.channels.cache.get(channelId) as TextChannel;
        if (!channel) throw new Error("Channel not found");

        try {
            const message = await channel.messages.fetch(messageId);
            if (!message) throw new Error("Message not found");
            await message.edit(content);
        } catch (e) {
            console.error(`Failed to edit message ${messageId}:`, e);
            // Don't throw, just log, as this is often non-critical (message might be deleted)
        }
    }
}
