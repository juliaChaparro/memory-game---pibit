import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import type { GameState } from '../utils/gameLogic';
import { initializeBoard, processFlip } from '../utils/gameLogic';

const activeRooms = new Map<string, GameState>();
const roomTimers = new Map<string, NodeJS.Timeout>();

import { getSanitizedState } from '../utils/gameLogic';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
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

  state.turnEndsAt = Date.now() + 20000;

  const timer = setTimeout(() => {
    const st = activeRooms.get(roomId);
    if (!st || st.status !== 'PLAYING') return;
    
    if (st.flippedCards) {
      for (let idx of st.flippedCards) {
        const card = st.board[idx];
        if (card) card.isFlipped = false;
      }
    }
    st.flippedCards = [];
    st.currentTurn = st.currentTurn === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    
    io.to(roomId).emit('turn_timeout');
    
    startTurnTimer(roomId, io);
    io.to(roomId).emit('board_update', getSanitizedState(st));
  }, 20000);

  roomTimers.set(roomId, timer);
}

function finalizeGame(roomId: string, state: GameState, io: Server, prisma: PrismaClient, reason?: string) {
  state.status = 'FINISHED';
  clearTurnTimer(roomId);
  
  let winner: typeof state.players[0] | undefined;
  if (reason === 'disconnect') {
    winner = state.players.find(p => p.role === state.currentTurn); // if someone disconnected, we can just say the remaining one wins (handled specifically below)
  } else {
    winner = state.players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
  }

  const payload: any = { players: state.players };
  if (winner) payload.winner = winner.id;
  if (reason) payload.reason = reason;

  io.to(roomId).emit('game_over', payload);

  const timeSpent = Math.floor((Date.now() - (state.startTime || Date.now())) / 1000);

  for (const p of state.players) {
    prisma.gameSession.create({
      data: {
        userId: p.id,
        gameMode: 'MULTIPLAYER_ONLINE',
        score: p.score,
        hits: p.hits,
        misses: p.misses,
        totalMoves: p.totalMoves,
        timeSpent: timeSpent
      }
    }).catch(console.error);
  }
  
  activeRooms.delete(roomId);
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
      players: [{ 
        id: userId, socketId: socket.id, score: 0, matches: 0, role: 'PLAYER_1', 
        hits: 0, misses: 0, totalMoves: 0, 
        userName: socket.data.user?.username || socket.data.user?.name, 
        avatarUrl: socket.data.user?.avatarUrl 
      }],
      currentTurn: 'PLAYER_1',
      matches: 0,
      status: 'WAITING',
      pairs: pares,
      cols,
      isAnimating: false,
      startTime: Date.now()
    };
    activeRooms.set(roomId, state);
    
    socket.emit('player_assigned', { role: 'PLAYER_1' });
    socket.emit('room_created', { roomId, state: getSanitizedState(state) });
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
      player = { 
        id: userId, socketId: socket.id, score: 0, matches: 0, role: 'PLAYER_2', 
        hits: 0, misses: 0, totalMoves: 0, 
        userName: socket.data.user?.username || socket.data.user?.name, 
        avatarUrl: socket.data.user?.avatarUrl 
      };
      state.players.push(player);
    }
    
    socket.emit('player_assigned', { role: player.role });

    if (state.players.length === 2) {
      state.status = 'PLAYING';
      state.startTime = Date.now();
      
      startTurnTimer(roomId, io);
      
      io.to(roomId).emit('game_start', getSanitizedState(state));
    }
  });

  socket.on('flip_card', (data: { roomId: string; cardIndex: number }) => {
    const { roomId, cardIndex } = data;
    const state = activeRooms.get(roomId);
    if (!state || state.status !== 'PLAYING') return;
    
    if (state.isAnimating) return;

    const currentPlayer = state.players.find(p => p.role === state.currentTurn);
    if (!currentPlayer || currentPlayer.socketId !== socket.id) return;

    const { gameOver, isMatch } = processFlip(state, cardIndex);
    
    if (isMatch === false) {
      clearTurnTimer(roomId);
      state.isAnimating = true;
      state.lastMove = 'MISMATCH';
      io.to(roomId).emit('board_update', getSanitizedState(state));
      
      setTimeout(() => {
        if (state.flippedCards) {
           for (let idx of state.flippedCards) {
             const card = state.board[idx];
             if (card) card.isFlipped = false;
           }
        }
        state.flippedCards = [];
        state.currentTurn = state.currentTurn === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
        state.isAnimating = false;
        state.lastMove = null;
        
        startTurnTimer(roomId, io);
        io.to(roomId).emit('board_update', getSanitizedState(state));
      }, 1500);
    } else if (isMatch === true) {
      state.lastMove = 'MATCH';
      startTurnTimer(roomId, io);
      io.to(roomId).emit('board_update', getSanitizedState(state));
    } else {
      state.lastMove = null;
      io.to(roomId).emit('board_update', getSanitizedState(state));
    }

    if (gameOver) {
      finalizeGame(roomId, state, io, prisma);
    }
  });

  socket.on('disconnect', () => {
    for (const [roomId, state] of activeRooms.entries()) {
      const player = state.players.find(p => p.socketId === socket.id);
      if (player) {
        state.currentTurn = player.role === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1'; // other player wins
        finalizeGame(roomId, state, io, prisma, 'disconnect');
      }
    }
  });
}
