import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.js';
import { getUploadUrl } from '../services/storage.js';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const PresignBody = z.object({
  filename: z.string().min(1),
  content_type: z.string().default('video/mp4'),
  file_size_bytes: z.number().int().positive(),
  duration_ms: z.number().int().nullable().optional(),
});

const CompleteBody = z.object({
  storage_key: z.string().min(1),
  filename: z.string().min(1),
  file_size_bytes: z.number().int().positive(),
  mime_type: z.string().default('video/mp4'),
  duration_ms: z.number().int().nullable().optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
});

export async function uploadRoutes(server: FastifyInstance) {
  // POST /api/uploads/presign — Get a presigned upload URL
  server.post('/presign', async (request, reply) => {
    const body = PresignBody.parse(request.body);
    const ext = body.filename.split('.').pop() || 'mp4';
    const storageKey = `uploads/${nanoid(12)}.${ext}`;

    const uploadUrl = await getUploadUrl(storageKey, body.content_type);

    return reply.send({
      upload_url: uploadUrl,
      storage_key: storageKey,
      expires_in: 3600,
    });
  });

  // POST /api/uploads/complete — Mark upload as complete, create asset record
  server.post('/complete', async (request, reply) => {
    const body = CompleteBody.parse(request.body);

    const [asset] = await sql`
      INSERT INTO shared_assets (storage_key, filename, file_size_bytes, mime_type, duration_ms, width, height)
      VALUES (${body.storage_key}, ${body.filename}, ${body.file_size_bytes}, ${body.mime_type}, ${body.duration_ms ?? null}, ${body.width ?? null}, ${body.height ?? null})
      RETURNING id, storage_key, filename, file_size_bytes, mime_type, duration_ms, is_public, view_count, created_at
    `;

    return reply.code(201).send({
      status: 'completed',
      asset: asset,
    });
  });
}
