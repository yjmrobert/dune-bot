export interface DiscordButtonCommand {
    type: string;
    target?: string;
    value?: string;
}

export interface GameButton {
    label: string;
    style: 'PRIMARY' | 'SECONDARY' | 'SUCCESS' | 'DANGER';
    command: DiscordButtonCommand;
    disabled?: boolean;
}

export interface GameEmbedField {
    name: string;
    value: string;
    inline?: boolean;
}

export interface GameEmbed {
    title: string;
    description?: string;
    color?: string; // Hex color string e.g., "#FF0000"
    fields?: GameEmbedField[];
    imageUrl?: string;
}

export interface GameView {
    content?: string;
    embed?: GameEmbed;
    buttons: GameButton[];
}
