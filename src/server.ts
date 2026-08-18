import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { handleGameSockets } from './sockets/game.socket';
import { setupAuthRoutes } from './routes/auth.route';
import { logger } from './utils/logger';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const prisma = new PrismaClient();

const app = express();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Adiciona logger nas requisições
app.use((req, res, next) => {
  logger.info(`[HTTP] ${req.method} ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname, '..')));

app.use('/api/auth', setupAuthRoutes(prisma));

app.post('/api/game-sessions', async (req, res) => {
    try {
        const token = req.cookies?.auth_token;
        if (!token) {
            return res.status(401).json({ error: 'Acesso negado: Usuário não autenticado.' });
        }

        const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-development-only';
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.userId;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.username) {
            return res.status(403).json({ error: 'Perfil incompleto. Defina um username antes de jogar.' });
        }

        const { gameMode, score, hits, misses, totalMoves, timeSpent } = req.body;
        
        // Conversão explícita para Int, prevenindo falhas do Prisma com strings do Front-end
        const session = await prisma.gameSession.create({
            data: {
                userId,
                gameMode: String(gameMode) || 'SOLO',
                score: Number(score) || 0,
                hits: Number(hits) || 0,
                misses: Number(misses) || 0,
                totalMoves: Number(totalMoves) || 0,
                timeSpent: Number(timeSpent) || 0
            }
        });
        
        console.log('[GAME_SAVE_SUCCESS] Partida registrada para o jogador:', userId);
        res.status(201).json(session);
    } catch (error: any) {
        console.error('[GAME_SAVE_ERROR] Falha ao salvar no banco:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Acesso negado: Token inválido.' });
        }
        res.status(500).json({ error: 'Erro interno ao salvar a partida. Detalhes registrados nos logs do servidor.' });
    }
});

app.get('/api/game-sessions', async (req, res) => {
    try {
        const sessions = await prisma.gameSession.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(sessions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar partidas.' });
    }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware de Autenticação para WebSockets
io.use((socket, next) => {
  const cookieHeader = socket.request.headers.cookie;
  if (!cookieHeader) {
    logger.warn(`[SOCKET_AUTH] Rejeitado ${socket.id}: Sem cookies`);
    return next(new Error('Authentication error'));
  }

  const token = cookieHeader.split(';').find(c => c.trim().startsWith('auth_token='))?.split('=')[1];
  if (!token) {
    logger.warn(`[SOCKET_AUTH] Rejeitado ${socket.id}: auth_token ausente`);
    return next(new Error('Authentication error'));
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-development-only';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    socket.data.user = decoded;
    logger.info(`[SOCKET_AUTH] Autorizado: ${decoded.email} (${socket.id})`);
    next();
  } catch (err) {
    logger.warn(`[SOCKET_AUTH] Rejeitado ${socket.id}: Token inválido`);
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  logger.info(`[SOCKET] User connected: ${socket.id} - ${socket.data.user.email}`);
  handleGameSockets(io, socket, prisma);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`[SERVER] Server running on port ${PORT}`);
});
