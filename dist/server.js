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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const game_socket_1 = require("./sockets/game.socket");
const auth_route_1 = require("./routes/auth.route");
const logger_1 = require("./utils/logger");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv.config();
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new adapter_libsql_1.PrismaLibSql({ url: dbUrl });
const prisma = new client_1.PrismaClient({ adapter });
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: true,
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Adiciona logger nas requisições
app.use((req, res, next) => {
    logger_1.logger.info(`[HTTP] ${req.method} ${req.url}`);
    next();
});
app.use(express_1.default.static(path_1.default.join(__dirname, '..')));
app.use('/api/auth', (0, auth_route_1.setupAuthRoutes)(prisma));
app.post('/api/game-sessions', async (req, res) => {
    try {
        const token = req.cookies?.auth_token;
        if (!token) {
            return res.status(401).json({ error: 'Acesso negado: Usuário não autenticado.' });
        }
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-development-only';
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const userId = decoded.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.username) {
            return res.status(403).json({ error: 'Perfil incompleto. Defina um username antes de jogar.' });
        }
        const { modo, pares, tempo, pontuacao, erros } = req.body;
        // Conversão explícita para Int, prevenindo falhas do Prisma com strings do Front-end
        const session = await prisma.gameSession.create({
            data: {
                userId,
                modo: Number(modo) || 0,
                pares: Number(pares) || 0,
                tempo: Number(tempo) || 0,
                pontuacao: Number(pontuacao) || 0,
                erros: Number(erros) || 0
            }
        });
        logger_1.logger.info(`[DB_SUCCESS] Nova partida salva! Modo: ${modo}, Pontos: ${pontuacao}, User: ${user.username}`);
        res.status(201).json(session);
    }
    catch (error) {
        logger_1.logger.error(`[DB_ERROR] Erro na rota /api/game-sessions: ${error.message}`, { stack: error.stack });
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar partidas.' });
    }
});
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
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
        logger_1.logger.warn(`[SOCKET_AUTH] Rejeitado ${socket.id}: Sem cookies`);
        return next(new Error('Authentication error'));
    }
    const token = cookieHeader.split(';').find(c => c.trim().startsWith('auth_token='))?.split('=')[1];
    if (!token) {
        logger_1.logger.warn(`[SOCKET_AUTH] Rejeitado ${socket.id}: auth_token ausente`);
        return next(new Error('Authentication error'));
    }
    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-development-only';
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        socket.data.user = decoded;
        logger_1.logger.info(`[SOCKET_AUTH] Autorizado: ${decoded.email} (${socket.id})`);
        next();
    }
    catch (err) {
        logger_1.logger.warn(`[SOCKET_AUTH] Rejeitado ${socket.id}: Token inválido`);
        next(new Error('Authentication error'));
    }
});
io.on('connection', (socket) => {
    logger_1.logger.info(`[SOCKET] User connected: ${socket.id} - ${socket.data.user.email}`);
    (0, game_socket_1.handleGameSockets)(io, socket, prisma);
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger_1.logger.info(`[SERVER] Server running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map