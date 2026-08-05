import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, fallbackAnswer, groundingPrompt, retrieve } from './retrieval.js';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const publicRoot = join(root, 'public');
const catalog = JSON.parse(await readFile(join(root, 'data', 'catalog.json'), 'utf8'));
const index = buildIndex(catalog.records);
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4178);
const rateWindows = new Map();

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function json(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(value));
}

function allowRequest(request) {
  const address = request.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const current = rateWindows.get(address);
  if (!current || now - current.startedAt > 60_000) {
    rateWindows.set(address, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= 30;
}

function authorized(request) {
  const expected = process.env.NAVIGATOR_ACCESS_TOKEN;
  if (!expected) return true;
  return request.headers.authorization === `Bearer ${expected}`;
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32_768) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function groqAnswer(query, hits) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const timeoutMs = Number(process.env.GROQ_TIMEOUT_MS || 15_000);
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Use supplied route evidence only. Do not provide clinical advice.' },
        { role: 'user', content: groundingPrompt(query, hits) },
      ],
      temperature: 0.2,
      max_tokens: 350,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Groq returned HTTP ${response.status}`);
  const body = await response.json();
  return String(body?.choices?.[0]?.message?.content || '').trim() || null;
}

async function handleQuery(request, response) {
  if (!authorized(request)) return json(response, 401, { error: 'Unauthorized' });
  if (!allowRequest(request)) return json(response, 429, { error: 'Rate limit exceeded' });
  const body = await readJsonBody(request);
  const query = String(body.query || '').trim();
  if (query.length < 2 || query.length > 500) {
    return json(response, 400, { error: 'query must contain 2–500 characters' });
  }

  const hits = retrieve(index, query);
  const deterministic = fallbackAnswer(query, hits);
  let answer = deterministic;
  let source = 'catalog';
  let providerError = null;
  if (hits.length && process.env.GROQ_API_KEY) {
    try {
      answer = (await groqAnswer(query, hits)) || deterministic;
      source = answer === deterministic ? 'catalog' : 'groq';
    } catch (error) {
      providerError = error instanceof Error ? error.message : 'Groq unavailable';
    }
  }

  return json(response, 200, {
    query,
    answer,
    source,
    providerError,
    destinations: hits.map(({ searchableText, matchedTerms, ...hit }) => ({ ...hit, matchedTerms })),
  });
}

async function serveStatic(pathname, response) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const relative = normalize(requested).replace(/^([/\\])+/, '');
  const filePath = join(publicRoot, relative);
  if (!filePath.startsWith(publicRoot)) return json(response, 403, { error: 'Forbidden' });
  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': requested === '/index.html' ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'",
    });
    response.end(body);
  } catch {
    json(response, 404, { error: 'Not found' });
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (request.method === 'GET' && url.pathname === '/api/health') {
      return json(response, 200, {
        ok: true,
        documents: index.length,
        catalogCommit: catalog.sourceCommit,
        groqConfigured: Boolean(process.env.GROQ_API_KEY),
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/catalog') {
      return json(response, 200, { generatedAt: catalog.generatedAt, records: index });
    }
    if (request.method === 'POST' && url.pathname === '/api/query') {
      return await handleQuery(request, response);
    }
    if (request.method === 'GET') return await serveStatic(url.pathname, response);
    return json(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    return json(response, 500, { error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

server.listen(port, host, () => {
  console.log(`CareDroid App Navigator listening on http://${host}:${port}`);
  console.log(`Indexed ${index.length} verified application locations.`);
  console.log(process.env.GROQ_API_KEY ? 'Groq synthesis enabled.' : 'Catalog-only mode enabled.');
});
