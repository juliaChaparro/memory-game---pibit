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
  playerNumber: 1 | 2; // Papel fixo
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
  isAnimating: boolean; // Controla se o front-end deve travar a tela
  turnEndsAt?: number; // Timestamp de quando o turno acaba
}

export function initializeBoard(pares: number): Card[] {
  const todasImagens = [
      "ANTA.png", "CABEÇUDO.png", "CAITITU.png", "CARANGUEJO-VERMELHO.png",
      "CARANGUEJO.png", "CUTIA.png", "INABÚ.png", "JABUTI.png",
      "JACARETINGA.png", "JACU.png", "MATAMATÁ.png", "PERDIZ.png",
      "PREGUIÇA.png", "QUEIXADA.png", "TAMANDUÁ.png", "TATU-CANASTRA.png",
      "TATU.png", "VEADO VERMELHO.png"
  ];

  // Embaralhar imagens
  const embaralhadas = [...todasImagens];
  for (let i = embaralhadas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tempI = embaralhadas[i] as string;
      const tempJ = embaralhadas[j] as string;
      embaralhadas[i] = tempJ;
      embaralhadas[j] = tempI;
  }

  const selecionadas = embaralhadas.slice(0, pares);
  let nomesImagens = [...selecionadas, ...selecionadas];

  for (let k = 0; k < 2; k++) {
    for (let i = nomesImagens.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tempI = nomesImagens[i] as string;
        const tempJ = nomesImagens[j] as string;
        nomesImagens[i] = tempJ;
        nomesImagens[j] = tempI;
    }
  }

  return nomesImagens.map((val, idx) => ({
    id: idx,
    value: val as string,
    isFlipped: false,
    isMatched: false
  }));
}

export function processFlip(state: GameState, cardIndex: number): { gameOver: boolean, isMatch: boolean | null } {
  if (state.isAnimating) return { gameOver: false, isMatch: null }; // Bloqueio caso servidor esteja aguardando

  const card = state.board[cardIndex];
  if (!card || card.isFlipped || card.isMatched) return { gameOver: false, isMatch: null };

  if (!state.flippedCards) state.flippedCards = [];
  
  card.isFlipped = true;
  state.flippedCards.push(cardIndex);

  let isMatch = null;

  if (state.flippedCards.length === 2) {
    const [idx1, idx2] = state.flippedCards as [number, number];
    const card1 = state.board[idx1];
    const card2 = state.board[idx2];

    if (card1 && card2 && card1.value === card2.value) {
      card1.isMatched = true;
      card2.isMatched = true;
      
      const currentPlayer = state.players[state.turnIndex];
      if (currentPlayer) {
        const pontosBase = 100 + (state.cols - 2) * 20;
        currentPlayer.score += pontosBase;
        currentPlayer.matches += 1;
      }
      
      state.matches += 1;
      isMatch = true;
      state.flippedCards = [];
    } else {
      isMatch = false;
      const currentPlayer = state.players[state.turnIndex];
      if (currentPlayer) {
        currentPlayer.score = Math.max(0, currentPlayer.score - 10);
      }
    }
  }

  return { gameOver: state.matches === state.pairs, isMatch };
}
