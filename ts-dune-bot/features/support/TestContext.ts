export class TestContext {
    private static _gameId: number = 0;

    static get gameId(): number {
        return this._gameId;
    }

    static set gameId(id: number) {
        this._gameId = id;
    }
    private static _lastError: any = null;

    static get lastError(): any {
        return this._lastError;
    }

    static set lastError(error: any) {
        this._lastError = error;
    }
}
