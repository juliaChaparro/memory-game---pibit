import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

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
      audience: process.env.GOOGLE_CLIENT_ID,
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
          data: { googleId, name, avatarUrl }
        });
        logger.info(`[AUTH_SUCCESS] Conta existente vinculada ao Google: ${email}`);
      } else {
        // Criação de nova conta
        user = await prisma.user.create({
          data: { googleId, email, name, avatarUrl }
        });
        logger.info(`[AUTH_SUCCESS] Nova conta Google registrada: ${email}`);
      }
    } else {
      // Atualiza possíveis alterações de foto/nome
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name, avatarUrl }
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl
      }
    });

  } catch (error) {
    logger.error(`[AUTH_FAIL] Erro ao autenticar: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

authRouter.get('/me', (req, res) => {
  const token = req.cookies?.auth_token;
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true, user: decoded });
  } catch (err) {
    res.status(401).json({ authenticated: false });
  }
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});
