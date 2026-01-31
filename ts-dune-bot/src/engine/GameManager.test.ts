import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameManager } from './GameManager';
import { DiscordService } from '../services/DiscordService';
import { GameEngine } from './GameEngine';
import { MapService } from '../services/MapService';
import { prisma } from '../db';

// Mock dependencies
vi.mock('../services/DiscordService');
vi.mock('./GameEngine');
vi.mock('../services/MapService');
vi.mock('../db', () => ({
    prisma: {
        game: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            findMany: vi.fn()
        }
    }
}));

describe('GameManager', () => {
    let gameManager: GameManager;
    let mockDiscordService: any;
    let mockGameEngine: any;

    beforeEach(() => {
        mockDiscordService = new DiscordService({} as any);
        mockGameEngine = new GameEngine();
        gameManager = new GameManager(mockDiscordService, mockGameEngine);
        vi.clearAllMocks();
    });

    describe('advancePhase', () => {
        it('should advance phase and update map', async () => {
            const gameId = 123;
            const mockGame = { id: gameId, guildId: 'g1', mapChannelId: 'c1', stateJson: '{}' };
            const mockState = { phase: 'Storm', turn: 2 };

            (prisma.game.findUnique as any).mockResolvedValue(mockGame);
            mockGameEngine.advancePhase.mockReturnValue(mockState);
            mockGameEngine.getAvailableActions.mockReturnValue([]);

            const result = await gameManager.advancePhase(gameId);

            expect(mockGameEngine.advancePhase).toHaveBeenCalledWith({});
            expect(MapService.updateMap).toHaveBeenCalledWith(
                { guildId: 'g1', mapChannelId: 'c1' },
                mockState,
                mockDiscordService
            );
            expect(result).toBe(mockState);
        });
    });
});
