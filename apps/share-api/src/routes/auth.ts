import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.js';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import crypto from 'node:crypto';

const MagicLinkBody = z.object({
  email: z.string().email(),
});

const VerifyBody = z.object({
  token: z.string().min(1),
});

export async function authRoutes(server: FastifyInstance) {
  // POST /api/auth/magic-link — Generate a magic link token
  server.post('/magic-link', async (request, reply) => {
    const { email } = MagicLinkBody.parse(request.body);

    // Upsert user
    const [user] = await sql`
      INSERT INTO users (email)
      VALUES (${email})
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id, email, display_name
    `;

    // Generate token (expires in 15 minutes)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

    await sql`
      INSERT INTO auth_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt})
    `;

    // In production: send email with magic link
    // For now, return token directly (dev mode)
    server.log.info({ email, token: token.slice(0, 8) + '...' }, 'Magic link generated');

    return reply.send({
      message: 'Magic link sent',
      // Dev only — remove in production
      _dev_token: process.env.NODE_ENV !== 'production' ? token : undefined,
    });
  });

  // POST /api/auth/verify — Verify magic link token, return session
  server.post('/verify', async (request, reply) => {
    const { token } = VerifyBody.parse(request.body);

    const [authToken] = await sql`
      SELECT at.id, at.user_id, at.expires_at, at.used_at,
             u.email, u.display_name
      FROM auth_tokens at
      JOIN users u ON u.id = at.user_id
      WHERE at.token = ${token}
    `;

    if (!authToken) {
      return reply.code(401).send({ error: 'Invalid token' });
    }

    if (authToken.used_at) {
      return reply.code(401).send({ error: 'Token already used' });
    }

    if (new Date(authToken.expires_at) < new Date()) {
      return reply.code(401).send({ error: 'Token expired' });
    }

    // Mark token as used
    await sql`UPDATE auth_tokens SET used_at = NOW() WHERE id = ${authToken.id}`;
    await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${authToken.user_id}`;

    // Generate session token
    const sessionToken = nanoid(48);

    return reply.send({
      session_token: sessionToken,
      user: {
        id: authToken.user_id,
        email: authToken.email,
        display_name: authToken.display_name,
      },
    });
  });

  // GET /api/auth/me — Get current user (placeholder — needs session middleware)
  server.get('/me', async (request, reply) => {
    // In production: validate session token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    // Placeholder: return anonymous user
    return reply.send({
      id: null,
      email: null,
      display_name: 'Anonymous',
      authenticated: false,
    });
  });
}
