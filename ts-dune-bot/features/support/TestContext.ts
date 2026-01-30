export class TestContext {
    private static _gameId: number = 0;

    static get gameId(): number {
        return this._gameId;
    }

    static set gameId(id: number) {
        this._gameId = id;
    }
}
