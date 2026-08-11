import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { GameState, initializeBoard, processFlip } from '../utils/gameLogic';

const activeRooms = new Map<string, GameState>();

export function handleGameSockets(io: Server, socket: Socket, prisma: PrismaClient) {
  
  socket.on('join_room', async (data: { roomId: string; userId: string }) => {
    const { roomId, userId } = data;
    socket.join(roomId);
    
    let state = activeRooms.get(roomId);
    if (!state) {
      state = {
        board: initializeBoard(),
        players: [],
        turnIndex: 0,
        matches: 0,
        status: 'WAITING'
      };
      activeRooms.set(roomId, state);
    }

    if (state.players.length < 2 && !state.players.find(p => p.id === userId)) {
      state.players.push({ id: userId, socketId: socket.id, score: 0 });
    }

    if (state.players.length === 2) {
      state.status = 'PLAYING';
      io.to(roomId).emit('game_start', state);
      
      // Atualiza banco de dados
      await prisma.room.upsert({
        where: { id: roomId },
        update: { status: 'PLAYING', player1Id: state.players[0].id, player2Id: state.players[1].id },
        create: { id: roomId, status: 'PLAYING', player1Id: state.players[0].id, player2Id: state.players[1].id }
      });
    } else {
      io.to(roomId).emit('waiting_player', state);
    }
  });

  socket.on('flip_card', (data: { roomId: string; cardIndex: number }) => {
    const { roomId, cardIndex } = data;
    const state = activeRooms.get(roomId);
    if (!state || state.status !== 'PLAYING') return;

    const currentPlayer = state.players[state.turnIndex];
    if (currentPlayer.socketId !== socket.id) return; // Não é a vez deste jogador

    const result = processFlip(state, cardIndex);
    io.to(roomId).emit('board_update', state);

    if (result.gameOver) {
      state.status = 'FINISHED';
      const winner = state.players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
      io.to(roomId).emit('game_over', { winner: winner.id, players: state.players });
      
      // Salva histórico no BD
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
