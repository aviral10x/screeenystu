import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.js';
import { getDownloadUrl } from '../services/storage.js';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const CreateShareBody = z.object({
  asset_id: z.string().uuid(),
  is_public: z.boolean().default(true),
  password: z.string().nullable().optional(),
  expires_in_hours: z.number().int().nullable().optional(),
});

export async function shareRoutes(server: FastifyInstance) {
  // POST /api/shares — Create a share link
  server.post('/', async (request, reply) => {
    const body = CreateShareBody.parse(request.body);
    const slug = nanoid(10);

    const expiresAt = body.expires_in_hours
      ? new Date(Date.now() + body.expires_in_hours * 3600_000).toISOString()
      : null;

    const [shareLink] = await sql`
      INSERT INTO share_links (asset_id, slug, is_active, expires_at)
      VALUES (${body.asset_id}, ${slug}, true, ${expiresAt})
      RETURNING id, asset_id, slug, is_active, expires_at, created_at
    `;

    const baseUrl = process.env.SHARE_BASE_URL || 'https://share.screencraft.app';

    return reply.code(201).send({
      share_id: shareLink.id,
      share_url: `${baseUrl}/${slug}`,
      slug: shareLink.slug,
      is_active: shareLink.is_active,
      expires_at: shareLink.expires_at,
      created_at: shareLink.created_at,
    });
  });

  // GET /api/shares/:slug — Get share details + video URL
  server.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const { slug } = request.params;

    const [link] = await sql`
      SELECT sl.id, sl.asset_id, sl.slug, sl.is_active, sl.expires_at, sl.created_at,
             sa.storage_key, sa.filename, sa.file_size_bytes, sa.mime_type, sa.duration_ms,
             sa.width, sa.height, sa.view_count
      FROM share_links sl
      JOIN shared_assets sa ON sa.id = sl.asset_id
      WHERE sl.slug = ${slug} AND sl.is_active = true
    `;

    if (!link) {
      return reply.code(404).send({ error: 'Share not found or expired' });
    }

    // Check expiry
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return reply.code(410).send({ error: 'Share link has expired' });
    }

    // Increment view count
    await sql`UPDATE shared_assets SET view_count = view_count + 1 WHERE id = ${link.asset_id}`;

    // Generate download URL
    const videoUrl = await getDownloadUrl(link.storage_key);

    return reply.send({
      share_id: link.id,
      slug: link.slug,
      filename: link.filename,
      mime_type: link.mime_type,
      duration_ms: link.duration_ms,
      width: link.width,
      height: link.height,
      view_count: link.view_count + 1,
      video_url: videoUrl,
      expires_at: link.expires_at,
      created_at: link.created_at,
    });
  });

  // DELETE /api/shares/:id — Deactivate a share link
  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const [updated] = await sql`
      UPDATE share_links SET is_active = false WHERE id = ${id}
      RETURNING id
    `;

    if (!updated) {
      return reply.code(404).send({ error: 'Share not found' });
    }

    return reply.send({ deleted: true, share_id: id });
  });
}
