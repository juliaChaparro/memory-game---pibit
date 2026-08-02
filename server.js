const express = require('express');
const cors = require('cors');
const { createClient } = require('@libsql/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('@prisma/client');

const libsql = createClient({ url: 'file:dev.db' });
const adapter = new PrismaLibSql(libsql);
const prisma = new PrismaClient({ adapter });
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
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
