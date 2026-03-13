import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.js';
import { z } from 'zod';

const CreateCommentBody = z.object({
  author_name: z.string().min(1).max(100),
  text: z.string().min(1).max(2000),
  timestamp_ms: z.number().int().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

export async function commentRoutes(server: FastifyInstance) {
  // GET /api/comments/:assetId — List comments for a shared asset
  server.get<{ Params: { assetId: string } }>('/:assetId', async (request, reply) => {
    const { assetId } = request.params;

    const comments = await sql`
      SELECT id, asset_id, user_id, author_name, text, timestamp_ms, parent_id, created_at
      FROM comments
      WHERE asset_id = ${assetId}
      ORDER BY created_at ASC
    `;

    return reply.send({
      asset_id: assetId,
      comments,
      count: comments.length,
    });
  });

  // POST /api/comments/:assetId — Add a comment
  server.post<{ Params: { assetId: string } }>('/:assetId', async (request, reply) => {
    const { assetId } = request.params;
    const body = CreateCommentBody.parse(request.body);

    // Verify asset exists
    const [asset] = await sql`SELECT id FROM shared_assets WHERE id = ${assetId}`;
    if (!asset) {
      return reply.code(404).send({ error: 'Asset not found' });
    }

    const [comment] = await sql`
      INSERT INTO comments (asset_id, author_name, text, timestamp_ms, parent_id)
      VALUES (${assetId}, ${body.author_name}, ${body.text}, ${body.timestamp_ms ?? null}, ${body.parent_id ?? null})
      RETURNING id, asset_id, author_name, text, timestamp_ms, parent_id, created_at
    `;

    return reply.code(201).send(comment);
  });

  // DELETE /api/comments/:assetId/:commentId — Delete a comment
  server.delete<{ Params: { assetId: string; commentId: string } }>(
    '/:assetId/:commentId',
    async (request, reply) => {
      const { commentId } = request.params;

      const [deleted] = await sql`
        DELETE FROM comments WHERE id = ${commentId}
        RETURNING id
      `;

      if (!deleted) {
        return reply.code(404).send({ error: 'Comment not found' });
      }

      return reply.send({ deleted: true, comment_id: commentId });
    },
  );
}
