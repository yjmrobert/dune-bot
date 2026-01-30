import * as createGame from "./createGame";
import * as deleteGame from "./deleteGame";
import * as deleteAllGames from "./deleteAllGames";
import * as joinGame from "./joinGame";
import * as startGame from "./startGame";
import * as nextPhase from "./nextPhase";

export const commands = {
    [createGame.data.name]: createGame,
    [deleteGame.data.name]: deleteGame,
    [deleteAllGames.data.name]: deleteAllGames,
    [joinGame.data.name]: joinGame,
    [startGame.data.name]: startGame,
    [nextPhase.data.name]: nextPhase
};
