import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { isValidUsername, containsProfanity, generatePlayerTag } from '../utils/validation';

export const authRouter = Router();

// A instância do Prisma será passada no setup
let prisma: PrismaClient;

export const setupAuthRoutes = (prismaClient: PrismaClient) => {
  prisma = prismaClient;
  return authRouter;
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-development-only';

authRouter.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      logger.warn('[AUTH_FAIL] Token não fornecido');
      return res.status(400).json({ error: 'Token missing' });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID as string,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      logger.warn('[AUTH_FAIL] Payload do token inválido');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { sub: googleId, email, name, picture: avatarUrl } = payload;

    // "Find or Create" user no banco de dados
    let user = await prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      if (email) {
        user = await prisma.user.findUnique({ where: { email } });
      }
      
      if (user) {
        // Link conta existente
        user = await prisma.user.update({
          where: { id: user.id },
          data: { 
            googleId, 
            name: name || null, 
            avatarUrl: avatarUrl || null 
          }
        });
        logger.info(`[AUTH_SUCCESS] Conta existente vinculada ao Google: ${email}`);
      } else {
        // Criação de nova conta
        user = await prisma.user.create({
          data: { 
            googleId, 
            email: email || null, 
            name: name || null, 
            avatarUrl: avatarUrl || null 
          }
        });
        logger.info(`[AUTH_SUCCESS] Nova conta Google registrada: ${email}`);
      }
    } else {
      // Atualiza possíveis alterações de foto/nome
      user = await prisma.user.update({
        where: { id: user.id },
        data: { 
          name: name || null, 
          avatarUrl: avatarUrl || null 
        }
      });
      logger.info(`[AUTH_SUCCESS] Usuário Google logado: ${email}`);
    }

    // Geração do JWT
    const sessionToken = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Salvar token num cookie seguro HttpOnly
    res.cookie('auth_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });

    res.json({
      success: true,
      requireUsername: !user.username,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        username: user.username,
        playerTag: user.playerTag
      }
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[AUTH_FAIL] Erro ao autenticar: ${errorMsg}`);
    res.status(500).json({ error: `Internal Server Error: ${errorMsg}` });
  }
});

authRouter.post('/set-username', async (req, res) => {
  try {
    // Authenticate the user from cookie first
    const token = req.cookies?.auth_token;
    if (!token) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username não fornecido.' });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'Formato inválido. Use 3-16 caracteres, apenas letras, números e underlines.' });
    }

    if (containsProfanity(username)) {
      return res.status(400).json({ error: 'O nome escolhido contém termos não permitidos.' });
    }

    // Since we are using SQLite, we can just do a case-insensitive find using raw if needed,
    // or just fetch all and check, but Prisma's `equals` might be case sensitive in sqlite.
    // Let's do a case insensitive comparison manually since there are no users yet, or just rely on exact match.
    // In SQLite with Prisma, mode: 'insensitive' is not supported on findFirst.
    const allUsers = await prisma.user.findMany({
      where: {
        username: { not: null }
      }
    });
    
    const existing = allUsers.find(u => u.username?.toLowerCase() === username.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
    }

    let playerTag = generatePlayerTag();
    let tagExists = await prisma.user.findUnique({ where: { playerTag } });
    
    while(tagExists) {
      playerTag = generatePlayerTag();
      tagExists = await prisma.user.findUnique({ where: { playerTag } });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        playerTag
      }
    });

    res.status(200).json({
      success: true,
      message: 'Username definido com sucesso.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl,
        username: updatedUser.username,
        playerTag: updatedUser.playerTag
      }
    });

  } catch (error) {
    logger.error(`[ERRO_PRISMA_DB] /api/auth/set-username: ${error}`);
    return res.status(500).json({ error: 'Erro interno ao registrar username.' });
  }
});

authRouter.get('/me', async (req, res) => {
  const token = req.cookies?.auth_token;
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    // Refresh user from DB to get the latest username and playerTag
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ authenticated: false });
    }
    res.json({ authenticated: true, user });
  } catch (err) {
    res.status(401).json({ authenticated: false });
  }
});

authRouter.get('/config', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});
