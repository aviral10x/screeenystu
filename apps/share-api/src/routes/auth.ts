import type { FastifyInstance } from 'fastify';

export async function authRoutes(server: FastifyInstance) {
  // POST /api/auth/magic-link — Send magic link email
  server.post('/magic-link', async (request, reply) => {
    // Phase 5: Implement magic link email sending
    return reply.status(501).send({
      error: 'Not implemented',
      message: 'Auth will be implemented in Phase 5',
    });
  });

  // POST /api/auth/verify — Verify magic link token
  server.post('/verify', async (request, reply) => {
    return reply.status(501).send({
      error: 'Not implemented',
      message: 'Auth will be implemented in Phase 5',
    });
  });

  // GET /api/auth/me — Get current user
  server.get('/me', async (request, reply) => {
    return reply.status(501).send({
      error: 'Not implemented',
      message: 'Auth will be implemented in Phase 5',
    });
  });
}
