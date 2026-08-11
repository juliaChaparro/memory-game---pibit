const express = require('express');
const cors = require('cors');
require('dotenv').config();
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:dev.db';
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('@prisma/client');

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });
console.log('Prisma client initialized with adapter');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

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

const PORT = 3333;
app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    
    // Garantir que a pasta do banco SQLite exista no container se configurada em outro local
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('/db/')) {
        const fs = require('fs');
        const path = require('path');
        const dbDir = path.join(__dirname, 'db');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log('Pasta /db criada para o SQLite.');
        }
    }
});
