import type { FastifyInstance } from 'fastify';

export async function commentRoutes(server: FastifyInstance) {
  // GET /api/comments/:assetId — Get comments for a shared asset
  server.get<{ Params: { assetId: string } }>('/:assetId', async (request, reply) => {
    return reply.send({
      asset_id: request.params.assetId,
      comments: [],
    });
  });

  // POST /api/comments/:assetId — Add a comment
  server.post<{ Params: { assetId: string } }>('/:assetId', async (request, reply) => {
    return reply.send({
      comment_id: `comment-${Date.now()}`,
      asset_id: request.params.assetId,
      created_at: new Date().toISOString(),
    });
  });

  // DELETE /api/comments/:assetId/:commentId — Delete a comment
  server.delete<{ Params: { assetId: string; commentId: string } }>(
    '/:assetId/:commentId',
    async (request, reply) => {
      return reply.send({ deleted: true });
    },
  );
}
