export interface Card {
    id: number;
    value: string;
    isFlipped: boolean;
    isMatched: boolean;
}
export interface Player {
    id: string;
    socketId: string;
    score: number;
    matches: number;
    playerNumber: 1 | 2;
}
export interface GameState {
    board: Card[];
    players: Player[];
    turnIndex: number;
    matches: number;
    status: 'WAITING' | 'PLAYING' | 'FINISHED';
    flippedCards?: number[];
    pairs: number;
    cols: number;
    isAnimating: boolean;
    turnEndsAt?: number;
}
export declare function initializeBoard(pares: number): Card[];
export declare function processFlip(state: GameState, cardIndex: number): {
    gameOver: boolean;
    isMatch: boolean | null;
};
//# sourceMappingURL=gameLogic.d.ts.map