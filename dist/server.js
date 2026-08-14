"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const adapter_libsql_1 = require("@prisma/adapter-libsql");
const game_socket_1 = require("./sockets/game.socket");
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv.config();
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new adapter_libsql_1.PrismaLibSql({ url: dbUrl });
const prisma = new client_1.PrismaClient({ adapter });
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '..')));
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar partidas.' });
    }
});
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    (0, game_socket_1.handleGameSockets)(io, socket, prisma);
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map