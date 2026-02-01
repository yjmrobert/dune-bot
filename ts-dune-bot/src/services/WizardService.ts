import { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, EmbedBuilder } from "discord.js";
import { GameState } from "../types";
import { IWizardStrategy } from "./wizards/IWizardStrategy";
import { TraitorWizardStrategy } from "./wizards/TraitorWizardStrategy";
import { ForcePlacementWizardStrategy } from "./wizards/ForcePlacementWizardStrategy";
import { RevivalWizardStrategy } from "./wizards/RevivalWizardStrategy";
import { ShipmentWizardStrategy } from "./wizards/ShipmentWizardStrategy";
import { MovementWizardStrategy } from "./wizards/MovementWizardStrategy";
import { BattleWizardStrategy } from "./wizards/BattleWizardStrategy";

export interface WizardStep {
    content?: string;
    embed?: EmbedBuilder;
    components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[];
}

export class WizardService {
    private static strategies: Record<string, IWizardStrategy> = {
        "setup_traitor": new TraitorWizardStrategy(),
        "setup_forces": new ForcePlacementWizardStrategy(),
        "revival": new RevivalWizardStrategy(),
        "shipment": new ShipmentWizardStrategy(),
        "movement": new MovementWizardStrategy(),
        "battle": new BattleWizardStrategy()
    };

    static getWizardKey(playerId: string, wizardType: string): string {
        return `p_${playerId}_${wizardType}`;
    }

    static getWizardState(state: GameState, playerId: string, wizardType: string): any {
        const key = this.getWizardKey(playerId, wizardType);
        return state.wizardState[key] || {};
    }

    static updateWizardState(state: GameState, playerId: string, wizardType: string, data: any) {
        const key = this.getWizardKey(playerId, wizardType);
        state.wizardState[key] = { ...state.wizardState[key], ...data };
    }

    static clearWizardState(state: GameState, playerId: string, wizardType: string) {
        const key = this.getWizardKey(playerId, wizardType);
        delete state.wizardState[key];
    }

    static async handleWizardInteraction(state: GameState, interaction: any, wizardType: string, action: string, args: string[]): Promise<WizardStep> {
        const playerId = interaction.user.id;
        const strategy = this.strategies[wizardType];

        if (!strategy) {
            return { content: `Unknown wizard type: ${wizardType}`, components: [] };
        }

        return strategy.handleInteraction(state, playerId, action, interaction, args);
    }
    
    // Static wrappers for legacy/direct access if needed, or update callers to use getStep via strategy
    // Ideally, we shouldn't expose specific public static methods anymore, but for compatibility let's route them.
    
    static getTraitorSelectionWizard(state: GameState, playerId: string): WizardStep {
        return this.strategies["setup_traitor"].getStep(state, playerId);
    }

    static getForcePlacementWizard(state: GameState, playerId: string): WizardStep {
        return this.strategies["setup_forces"].getStep(state, playerId);
    }

    static getRevivalWizard(state: GameState, playerId: string): WizardStep {
        return this.strategies["revival"].getStep(state, playerId);
    }

    static getShipmentWizard(state: GameState, playerId: string): WizardStep {
        return this.strategies["shipment"].getStep(state, playerId);
    }

    static getMovementWizard(state: GameState, playerId: string): WizardStep {
        return this.strategies["movement"].getStep(state, playerId);
    }

    static getBattleWizard(state: GameState, playerId: string): WizardStep {
        return this.strategies["battle"].getStep(state, playerId);
    }
}
