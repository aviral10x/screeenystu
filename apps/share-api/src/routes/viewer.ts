import type { FastifyInstance } from 'fastify';
import { sql } from '../db/client.js';
import { getDownloadUrl } from '../services/storage.js';

export async function viewerRoutes(server: FastifyInstance) {
  // GET /v/:slug — HTML video player page with comments
  server.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const { slug } = request.params;

    const [link] = await sql`
      SELECT sl.id, sl.asset_id, sl.slug, sl.is_active, sl.expires_at,
             sa.storage_key, sa.filename, sa.mime_type, sa.duration_ms,
             sa.width, sa.height, sa.view_count
      FROM share_links sl
      JOIN shared_assets sa ON sa.id = sl.asset_id
      WHERE sl.slug = ${slug} AND sl.is_active = true
    `;

    if (!link) {
      return reply.code(404).type('text/html').send(notFoundPage());
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return reply.code(410).type('text/html').send(expiredPage());
    }

    // Increment view count
    await sql`UPDATE shared_assets SET view_count = view_count + 1 WHERE id = ${link.asset_id}`;

    const videoUrl = await getDownloadUrl(link.storage_key);

    const comments = await sql`
      SELECT id, author_name, text, timestamp_ms, created_at
      FROM comments WHERE asset_id = ${link.asset_id}
      ORDER BY created_at ASC
    `;

    return reply.type('text/html').send(playerPage({
      slug,
      filename: link.filename,
      videoUrl,
      mimeType: link.mime_type,
      durationMs: link.duration_ms,
      width: link.width,
      height: link.height,
      viewCount: link.view_count + 1,
      comments,
      assetId: link.asset_id,
    }));
  });
}

interface PlayerData {
  slug: string;
  filename: string;
  videoUrl: string;
  mimeType: string;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  viewCount: number;
  comments: any[];
  assetId: string;
}

function playerPage(data: PlayerData) {
  const title = data.filename.replace(/\.[^.]+$/, '');
  const commentsHtml = data.comments.map((c) => `
    <div class="comment">
      <div class="comment-header">
        <strong>${esc(c.author_name)}</strong>
        ${c.timestamp_ms ? `<span class="timestamp" data-ms="${c.timestamp_ms}">${formatTime(c.timestamp_ms)}</span>` : ''}
      </div>
      <p>${esc(c.text)}</p>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — ScreenCraft</title>
  <meta name="description" content="Watch ${esc(title)} — shared via ScreenCraft">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:type" content="video.other">
  <meta property="og:video" content="${esc(data.videoUrl)}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Inter', sans-serif; background: #09090b; color: #e4e4e7; min-height: 100vh; }
    .container { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
    .player-wrapper { position: relative; border-radius: 12px; overflow: hidden; background: #18181b; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
    video { width: 100%; display: block; }
    .meta { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; }
    .title { font-size: 18px; font-weight: 600; }
    .views { font-size: 13px; color: #71717a; }
    .comments-section { margin-top: 24px; }
    .comments-section h3 { font-size: 14px; color: #a1a1aa; margin-bottom: 12px; }
    .comment { padding: 12px; border-radius: 8px; background: #18181b; margin-bottom: 8px; }
    .comment-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 13px; }
    .comment p { font-size: 14px; color: #d4d4d8; line-height: 1.5; }
    .timestamp { font-size: 11px; color: #6366f1; cursor: pointer; font-family: monospace; }
    .comment-form { display: flex; gap: 8px; margin-top: 16px; }
    .comment-form input, .comment-form textarea { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 8px 12px; color: #e4e4e7; font-size: 13px; }
    .comment-form input { width: 140px; }
    .comment-form textarea { flex: 1; resize: none; min-height: 40px; }
    .comment-form button { background: #4f46e5; color: white; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
    .comment-form button:hover { background: #4338ca; }
    .branding { text-align: center; padding: 32px 0 16px; font-size: 12px; color: #3f3f46; }
    .branding a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="player-wrapper">
      <video controls playsinline preload="metadata">
        <source src="${esc(data.videoUrl)}" type="${esc(data.mimeType)}">
      </video>
    </div>

    <div class="meta">
      <div class="title">${esc(title)}</div>
      <div class="views">${data.viewCount.toLocaleString()} view${data.viewCount !== 1 ? 's' : ''}</div>
    </div>

    <div class="comments-section">
      <h3>${data.comments.length} Comment${data.comments.length !== 1 ? 's' : ''}</h3>
      ${commentsHtml}

      <form class="comment-form" onsubmit="postComment(event)">
        <input name="author" placeholder="Your name" required>
        <textarea name="text" placeholder="Add a comment..." required></textarea>
        <button type="submit">Post</button>
      </form>
    </div>

    <div class="branding">
      Made with <a href="https://screencraft.app">ScreenCraft</a>
    </div>
  </div>

  <script>
    const assetId = '${data.assetId}';
    const apiBase = window.location.origin;

    // Click timestamp to seek video
    document.querySelectorAll('.timestamp').forEach(el => {
      el.addEventListener('click', () => {
        const ms = parseInt(el.dataset.ms);
        document.querySelector('video').currentTime = ms / 1000;
      });
    });

    async function postComment(e) {
      e.preventDefault();
      const form = e.target;
      const body = {
        author_name: form.author.value,
        text: form.text.value,
        timestamp_ms: Math.round(document.querySelector('video').currentTime * 1000),
      };
      await fetch(apiBase + '/api/comments/' + assetId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      window.location.reload();
    }
  </script>
</body>
</html>`;
}

function notFoundPage() {
  return `<!DOCTYPE html><html><head><title>Not Found</title><style>body{font-family:sans-serif;background:#09090b;color:#e4e4e7;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}h1{font-size:24px;}p{color:#71717a;}</style></head><body><div style="text-align:center"><h1>Video not found</h1><p>This share link doesn't exist or has been removed.</p></div></body></html>`;
}

function expiredPage() {
  return `<!DOCTYPE html><html><head><title>Expired</title><style>body{font-family:sans-serif;background:#09090b;color:#e4e4e7;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}h1{font-size:24px;}p{color:#71717a;}</style></head><body><div style="text-align:center"><h1>Link expired</h1><p>This share link has expired. Ask the owner for a new one.</p></div></body></html>`;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}
