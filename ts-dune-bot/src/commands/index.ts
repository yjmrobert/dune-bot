import * as createGame from "./createGame";
import * as deleteGame from "./deleteGame";
import * as deleteAllGames from "./deleteAllGames";

export const commands = {
    [createGame.data.name]: createGame,
    [deleteGame.data.name]: deleteGame,
    [deleteAllGames.data.name]: deleteAllGames
};
