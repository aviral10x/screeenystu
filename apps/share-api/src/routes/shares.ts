import type { FastifyInstance } from 'fastify';

export async function shareRoutes(server: FastifyInstance) {
  // POST /api/shares — Create a share link
  server.post('/', async (request, reply) => {
    return reply.send({
      share_id: `share-${Date.now()}`,
      share_url: `https://share.screencraft.app/stub-${Date.now()}`,
      is_public: true,
    });
  });

  // GET /api/shares/:id — Get share details
  server.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    return reply.send({
      share_id: request.params.id,
      share_url: `https://share.screencraft.app/${request.params.id}`,
      is_public: true,
      view_count: 0,
      created_at: new Date().toISOString(),
    });
  });

  // DELETE /api/shares/:id — Delete a share link
  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    return reply.send({ deleted: true });
  });
}
