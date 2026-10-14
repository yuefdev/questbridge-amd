import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import { createLocaliser, LocalisationError } from './localisation.mjs';

const endpoint = process.env.AMD_ENDPOINT || '';
if (endpoint) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('Use HTTPS for remote inference or HTTP on loopback only.');
  }
  if (url.username || url.password || url.search || url.hash) throw new Error('Keep credentials out of the endpoint URL.');
}
const localiser = createLocaliser({ endpoint, model: process.env.AMD_MODEL || '', apiKey: process.env.AMD_API_KEY || '' });
const page = await readFile(new URL('./public/index.html', import.meta.url));
const port = Number(process.env.PORT || 4186);
const host = process.env.HOST || '127.0.0.1';
const accessToken = process.env.DEMO_ACCESS_TOKEN || '';

function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path.startsWith('/api/') && accessToken) {
      const actual = Buffer.from(request.headers.authorization || '');
      const expected = Buffer.from(`Bearer ${accessToken}`);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        throw new LocalisationError('Use the private demo access link.', 401);
      }
    }
    if (request.method === 'GET' && path === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'" });
      response.end(page);
      return;
    }
    if (request.method === 'GET' && path === '/api/status') {
      json(response, 200, { configured: localiser.configured, model: process.env.AMD_MODEL || null, metrics: localiser.metrics(), cacheScope: 'Bounded in-memory cache; cleared when this server restarts.' });
      return;
    }
    if (request.method === 'POST' && path === '/api/translate') {
      const origin = request.headers.origin;
      if (origin && new URL(origin).host !== request.headers.host) throw new LocalisationError('Cross-origin requests are not accepted.', 403);
      if (!request.headers['content-type']?.startsWith('application/json')) throw new LocalisationError('Send application/json.', 415);
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 24000) throw new LocalisationError('Request body is too large.', 413);
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { throw new LocalisationError('Invalid JSON request.', 400); }
      json(response, 200, await localiser.translate(body?.text, body?.language));
      return;
    }
    json(response, 404, { error: 'Not found.' });
  } catch (error) {
    json(response, error instanceof LocalisationError ? error.status : 500, {
      error: error instanceof LocalisationError ? error.message : 'Request failed.',
    });
  }
});
server.requestTimeout = 100000;
server.listen(port, host, () => console.log(`QuestBridge listening on http://${host}:${port}; live inference ${localiser.configured ? 'configured' : 'not configured'}.`));
