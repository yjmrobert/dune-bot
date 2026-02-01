import { WizardStep } from "../WizardService";
import { GameState } from "../../types";

export interface IWizardStrategy {
    handleInteraction(state: GameState, playerId: string, action: string, interaction: any, args: string[]): Promise<WizardStep> | WizardStep;
    getStep(state: GameState, playerId: string): WizardStep;
}
