import type { FastifyInstance } from 'fastify';

export async function uploadRoutes(server: FastifyInstance) {
  // POST /api/uploads/presign — Get a presigned upload URL
  server.post('/presign', async (request, reply) => {
    // Phase 5: Generate S3 presigned PUT URL
    return reply.send({
      upload_url: 'https://localhost:9000/screencraft/stub-upload-url',
      storage_key: `uploads/stub-${Date.now()}.mp4`,
      expires_in: 3600,
    });
  });

  // POST /api/uploads/complete — Mark upload as complete
  server.post('/complete', async (request, reply) => {
    return reply.send({
      status: 'completed',
      asset_id: `asset-${Date.now()}`,
    });
  });
}
