"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeCommand = serializeCommand;
exports.deserializeCommand = deserializeCommand;
exports.mapToDiscordMessage = mapToDiscordMessage;
const discord_js_1 = require("discord.js");
// Custom ID Serialization Strategy
// Format: "TYPE:TARGET:VALUE"
function serializeCommand(command) {
    // 1. Validate inputs for delimiter collision
    if (command.type.includes(':'))
        throw new Error('Command Type cannot contain ":"');
    if (command.target?.includes(':'))
        throw new Error('Command Target cannot contain ":"');
    if (command.value?.includes(':'))
        throw new Error('Command Value cannot contain ":"');
    // 2. Construct parts array with strict slots
    const parts = [
        command.type,
        command.target ?? '',
        command.value ?? ''
    ];
    // 3. Trim trailing empty parts to save space, but preserve internal gaps
    while (parts.length > 1 && parts[parts.length - 1] === '') {
        parts.pop();
    }
    const id = parts.join(':');
    if (id.length > 100) {
        throw new Error(`CustomID exceeds 100 chars: ${id}`);
    }
    return id;
}
function deserializeCommand(customId) {
    const [type, target, value] = customId.split(':');
    return {
        type,
        target: target === '' ? undefined : target, // Map empty string back to undefined
        value: value === '' ? undefined : value
    };
}
function mapButtonStyle(style) {
    switch (style) {
        case 'PRIMARY': return discord_js_1.ButtonStyle.Primary;
        case 'SECONDARY': return discord_js_1.ButtonStyle.Secondary;
        case 'SUCCESS': return discord_js_1.ButtonStyle.Success;
        case 'DANGER': return discord_js_1.ButtonStyle.Danger;
        default: return discord_js_1.ButtonStyle.Secondary;
    }
}
function mapToDiscordMessage(view) {
    const payload = {};
    if (view.content) {
        payload.content = view.content;
    }
    if (view.embed) {
        const embed = new discord_js_1.EmbedBuilder();
        if (view.embed.title)
            embed.setTitle(view.embed.title);
        if (view.embed.description)
            embed.setDescription(view.embed.description);
        if (view.embed.color)
            embed.setColor(view.embed.color); // discord.js types can be picky about hex strings
        if (view.embed.imageUrl)
            embed.setImage(view.embed.imageUrl);
        if (view.embed.fields) {
            embed.addFields(view.embed.fields.map(f => ({
                name: f.name,
                value: f.value,
                inline: f.inline ?? false
            })));
        }
        payload.embeds = [embed];
    }
    if (view.buttons && view.buttons.length > 0) {
        const components = [];
        // chunk buttons into groups of 5
        const chunkSize = 5;
        for (let i = 0; i < view.buttons.length; i += chunkSize) {
            const chunk = view.buttons.slice(i, i + chunkSize);
            const row = new discord_js_1.ActionRowBuilder();
            chunk.forEach(btn => {
                const button = new discord_js_1.ButtonBuilder()
                    .setLabel(btn.label)
                    .setStyle(mapButtonStyle(btn.style))
                    .setCustomId(serializeCommand(btn.command))
                    .setDisabled(!!btn.disabled);
                row.addComponents(button);
            });
            components.push(row);
        }
        payload.components = components;
    }
    return payload;
}
