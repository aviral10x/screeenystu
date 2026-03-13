import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authRoutes } from './routes/auth.js';
import { uploadRoutes } from './routes/uploads.js';
import { shareRoutes } from './routes/shares.js';
import { commentRoutes } from './routes/comments.js';
import { viewerRoutes } from './routes/viewer.js';

export async function createServer() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Plugins
  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  // Health check
  server.get('/health', async () => {
    return { status: 'ok', service: 'screencraft-share-api', version: '0.1.0' };
  });

  // API Routes
  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(uploadRoutes, { prefix: '/api/uploads' });
  await server.register(shareRoutes, { prefix: '/api/shares' });
  await server.register(commentRoutes, { prefix: '/api/comments' });

  // Viewer (HTML pages)
  await server.register(viewerRoutes, { prefix: '/v' });

  return server;
}
