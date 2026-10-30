export interface Card {
  id: number;
  value: string | null;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface Player {
  id: string;
  socketId: string;
  score: number;
  matches: number;
  streak: number;
  role: 'PLAYER_1' | 'PLAYER_2';
  hits: number;
  misses: number;
  totalMoves: number;
  userName?: string;
  avatarUrl?: string;
}

export interface GameState {
  board: Card[];
  players: Player[];
  currentTurn: 'PLAYER_1' | 'PLAYER_2';
  matches: number;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  flippedCards?: number[];
  pairs: number;
  cols: number;
  isAnimating: boolean; 
  turnEndsAt?: number; 
  turnTimeRemainingMs?: number;
  startTime?: number;
  lastMove?: 'MATCH' | 'MISMATCH' | null;
  lastPointsEarned?: number | null;
  lastStreak?: number | null;
}

/**
 * Regra de Pontuação por Sequência (Streak) — Modo 2 Jogadores / Online:
 * - 1º acerto (ou acerto isolado após erro): 100 pontos
 * - 2º acerto consecutivo: 150 pontos (+50 de bônus)
 * - N-ésimo acerto consecutivo (N >= 1): Pontos = 100 + (N - 1) * 50
 */
export function calculateStreakPoints(streak: number): number {
  if (streak <= 0) return 0;
  return 100 + (streak - 1) * 50;
}

export function getSanitizedState(state: GameState): GameState {
  return {
    ...state,
    turnTimeRemainingMs: state.turnEndsAt ? Math.max(0, state.turnEndsAt - Date.now()) : 20000,
    board: state.board.map(card => ({
      ...card,
      value: (card.isFlipped || card.isMatched) ? card.value : null
    }))
  };
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
  if (state.isAnimating) return { gameOver: false, isMatch: null };

  const card = state.board[cardIndex];
  if (!card || card.isFlipped || card.isMatched) return { gameOver: false, isMatch: null };

  if (!state.flippedCards) state.flippedCards = [];
  
  card.isFlipped = true;
  state.flippedCards.push(cardIndex);

  let isMatch: boolean | null = null;

  if (state.flippedCards.length === 2) {
    const [idx1, idx2] = state.flippedCards as [number, number];
    const card1 = state.board[idx1];
    const card2 = state.board[idx2];
    
    const currentPlayer = state.players.find(p => p.role === state.currentTurn);
    if (currentPlayer) {
      currentPlayer.totalMoves += 1;
    }

    if (card1 && card2 && card1.value === card2.value) {
      card1.isMatched = true;
      card2.isMatched = true;
      
      if (currentPlayer) {
        currentPlayer.streak = (currentPlayer.streak || 0) + 1;
        const pontosGanhos = calculateStreakPoints(currentPlayer.streak);
        currentPlayer.score += pontosGanhos;
        currentPlayer.matches += 1;
        currentPlayer.hits += 1;
        state.lastPointsEarned = pontosGanhos;
        state.lastStreak = currentPlayer.streak;
      }
      
      state.matches += 1;
      isMatch = true;
      state.flippedCards = [];
    } else {
      isMatch = false;
      if (currentPlayer) {
        // Em caso de erro: zera o contador de acertos consecutivos (streak = 0)
        currentPlayer.streak = 0;
        currentPlayer.misses += 1;
      }
      state.lastPointsEarned = 0;
      state.lastStreak = 0;
    }
  }

  return { gameOver: state.matches === state.pairs, isMatch };
}
