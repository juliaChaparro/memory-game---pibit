import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { handleGameSockets } from './sockets/game.socket';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();
const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

app.post('/api/game-sessions', async (req, res) => {
    try {
        const { modo, pares, tempo, pontuacao, erros } = req.body;
        const session = await prisma.gameSession.create({
            data: {
                modo,
                pares,
                tempo,
                pontuacao,
                erros
            }
        });
        console.log(`Nova partida salva! Modo: ${modo}, Pontos: ${pontuacao}`);
        res.status(201).json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao salvar a partida.' });
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
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  handleGameSockets(io, socket, prisma);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
