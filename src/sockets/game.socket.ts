import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import type { GameState } from '../utils/gameLogic';
import { initializeBoard, processFlip } from '../utils/gameLogic';

const activeRooms = new Map<string, GameState>();
const roomTimers = new Map<string, NodeJS.Timeout>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function clearTurnTimer(roomId: string) {
  const timer = roomTimers.get(roomId);
  if (timer) clearTimeout(timer);
  roomTimers.delete(roomId);
}

function startTurnTimer(roomId: string, io: Server) {
  clearTurnTimer(roomId);

  const state = activeRooms.get(roomId);
  if (!state || state.status !== 'PLAYING') return;

  state.turnEndsAt = Date.now() + 20000; // 20 segundos

  const timer = setTimeout(() => {
    const st = activeRooms.get(roomId);
    if (!st || st.status !== 'PLAYING') return;
    
    // Desvira cartas que ficaram pendentes
    if (st.flippedCards) {
      for (let idx of st.flippedCards) {
        const card = st.board[idx];
        if (card) card.isFlipped = false;
      }
    }
    st.flippedCards = [];
    st.turnIndex = st.turnIndex === 0 ? 1 : 0;
    
    io.to(roomId).emit('turn_timeout'); // Front-end pode exibir um aviso se desejar
    
    startTurnTimer(roomId, io); // Recomeça pro outro jogador
    io.to(roomId).emit('board_update', st);
  }, 20000);

  roomTimers.set(roomId, timer);
}

export function handleGameSockets(io: Server, socket: Socket, prisma: PrismaClient) {
  
  socket.on('create_room', (data: { pares: number, cols: number }) => {
    const userId = socket.data.user?.userId;
    if (!userId) return;
    const { pares, cols } = data;
    const roomId = generateRoomCode();
    socket.join(roomId);
    
    const state: GameState = {
      board: initializeBoard(pares),
      players: [{ id: userId, socketId: socket.id, score: 0, matches: 0, playerNumber: 1 }],
      turnIndex: 0,
      matches: 0,
      status: 'WAITING',
      pairs: pares,
      cols,
      isAnimating: false
    };
    activeRooms.set(roomId, state);
    
    socket.emit('player_assigned', { playerNumber: 1 });
    socket.emit('room_created', { roomId, state });
  });

  socket.on('join_room_code', async (data: { roomId: string }) => {
    const userId = socket.data.user?.userId;
    if (!userId) return;
    const { roomId } = data;
    const state = activeRooms.get(roomId);
    
    if (!state) {
      socket.emit('error_message', { message: 'Sala não encontrada.' });
      return;
    }
    if (state.status !== 'WAITING') {
      socket.emit('error_message', { message: 'A sala já está em jogo ou cheia.' });
      return;
    }

    socket.join(roomId);
    
    let player = state.players.find(p => p.id === userId);
    if (!player) {
      player = { id: userId, socketId: socket.id, score: 0, matches: 0, playerNumber: 2 };
      state.players.push(player);
    }
    
    socket.emit('player_assigned', { playerNumber: player.playerNumber });

    if (state.players.length === 2) {
      state.status = 'PLAYING';
      
      // Inicia timer assim que o jogo começa
      startTurnTimer(roomId, io);
      
      io.to(roomId).emit('game_start', state);
      
      const player1Id = state.players[0]?.id;
      const player2Id = state.players[1]?.id;
      
      if (player1Id && player2Id) {
        try {
          await prisma.room.create({
            data: {
              id: roomId,
              status: 'PLAYING',
              player1Id,
              player2Id
            }
          });
        } catch(e) {
          // Ignora conflitos
        }
      }
    }
  });

  socket.on('flip_card', (data: { roomId: string; cardIndex: number }) => {
    const { roomId, cardIndex } = data;
    const state = activeRooms.get(roomId);
    if (!state || state.status !== 'PLAYING') return;
    
    if (state.isAnimating) {
      console.log(`[Socket] Ignores flip from ${socket.id} (Animating)`);
      return;
    }

    const currentPlayer = state.players[state.turnIndex];
    if (!currentPlayer || currentPlayer.socketId !== socket.id) {
      console.log(`[Socket] Bloqueado flip do ${socket.id}. Turno atual é do socket ${currentPlayer?.socketId}`);
      return;
    }

    const { gameOver, isMatch } = processFlip(state, cardIndex);
    
    if (isMatch === false) {
      // Errou. Pausa o timer atual durante a animação
      clearTurnTimer(roomId);
      state.isAnimating = true;
      io.to(roomId).emit('board_update', state);
      
      setTimeout(() => {
        if (state.flippedCards) {
           for (let idx of state.flippedCards) {
             const card = state.board[idx];
             if (card) card.isFlipped = false;
           }
        }
        state.flippedCards = [];
        state.turnIndex = state.turnIndex === 0 ? 1 : 0;
        state.isAnimating = false;
        
        // Retoma o timer para o próximo jogador
        startTurnTimer(roomId, io);
        io.to(roomId).emit('board_update', state);
      }, 1500);
    } else if (isMatch === true) {
      // Acertou. Reinicia o timer pro jogador tentar outro par
      startTurnTimer(roomId, io);
      io.to(roomId).emit('board_update', state);
    } else {
      // Virou a 1a carta. Não reseta o timer. Apenas atualiza a view.
      io.to(roomId).emit('board_update', state);
    }

    if (gameOver) {
      state.status = 'FINISHED';
      clearTurnTimer(roomId);
      const winner = state.players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
      io.to(roomId).emit('game_over', { winner: winner.id, players: state.players });
      
      prisma.room.update({
        where: { id: roomId },
        data: { status: 'FINISHED', winnerId: winner.id }
      }).catch(console.error);
      
      activeRooms.delete(roomId);
    }
  });

  socket.on('disconnect', () => {
    for (const [roomId, state] of activeRooms.entries()) {
      const playerIndex = state.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        state.status = 'FINISHED';
        clearTurnTimer(roomId);
        const winnerIndex = playerIndex === 0 ? 1 : 0;
        const winner = state.players[winnerIndex];
        
        if (winner) {
          io.to(roomId).emit('game_over', { reason: 'disconnect', winner: winner.id });
        }
        activeRooms.delete(roomId);
      }
    }
  });
}
