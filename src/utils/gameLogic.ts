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
}

export interface GameState {
  board: Card[];
  players: Player[];
  turnIndex: number;
  matches: number;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  flippedCards?: number[];
}

export function initializeBoard(): Card[] {
  const values = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const deck = [...values, ...values].map((val, idx) => ({
    id: idx,
    value: val,
    isFlipped: false,
    isMatched: false
  }));
  
  // Fisher-Yates Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function processFlip(state: GameState, cardIndex: number): { gameOver: boolean } {
  const card = state.board[cardIndex];
  if (card.isFlipped || card.isMatched) return { gameOver: false };

  if (!state.flippedCards) state.flippedCards = [];
  
  card.isFlipped = true;
  state.flippedCards.push(cardIndex);

  if (state.flippedCards.length === 2) {
    const [idx1, idx2] = state.flippedCards;
    const card1 = state.board[idx1];
    const card2 = state.board[idx2];

    if (card1.value === card2.value) {
      card1.isMatched = true;
      card2.isMatched = true;
      state.players[state.turnIndex].score += 1;
      state.matches += 1;
    } else {
      // Reverter no próximo turno logicamente; os clientes deverão dar setTimeout para fechar
      card1.isFlipped = false;
      card2.isFlipped = false;
      state.turnIndex = state.turnIndex === 0 ? 1 : 0;
    }
    state.flippedCards = [];
  }

  return { gameOver: state.matches === 8 };
}
