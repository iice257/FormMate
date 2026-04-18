// @ts-nocheck
import { createServer } from 'node:http';
import { config as loadDotenv } from 'dotenv';
import chatHandler from '../api/ai/chat.ts';
import transcribeHandler from '../api/ai/transcribe.ts';
import visionContextHandler from '../api/ai/vision-context.ts';
import imageExtractHandler from '../api/parser/image-extract.ts';
import scrapeHandler from '../api/proxy/scrape.ts';
import googleFormHandler from '../api/proxy/google-form.ts';
import healthHandler from '../api/health.ts';

const HOST = '127.0.0.1';
const PORT = 3000;

// Local API server should mirror Vercel env pulls used by frontend proxy flows.
loadDotenv({ path: '.env.local' });
loadDotenv();

if (typeof process.env.NODE_TLS_REJECT_UNAUTHORIZED === 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('[local-api] NODE_TLS_REJECT_UNAUTHORIZED is not set; defaulting to 0 for local TLS compatibility.');
}

const ROUTES = new Map([
  ['/api/ai/chat', { handler: chatHandler, parseJson: true, maxBytes: 2 * 1024 * 1024 }],
  ['/api/ai/transcribe', { handler: transcribeHandler, parseJson: false }],
  ['/api/ai/vision-context', { handler: visionContextHandler, parseJson: true, maxBytes: 22 * 1024 * 1024 }],
  ['/api/parser/image-extract', { handler: imageExtractHandler, parseJson: true, maxBytes: 22 * 1024 * 1024 }],
  ['/api/proxy/scrape', { handler: scrapeHandler, parseJson: false }],
  ['/api/proxy/google-form', { handler: googleFormHandler, parseJson: false }],
  ['/api/health', { handler: healthHandler, parseJson: false }],
]);

function parseQuery(searchParams) {
  const query = {};
  for (const [key, value] of searchParams.entries()) {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      query[key] = [existing, value];
    }
  }
  return query;
}

function decorateResponse(res) {
  if (typeof res.status !== 'function') {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
  }

  if (typeof res.json !== 'function') {
    res.json = (payload) => {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json');
      }
      res.end(JSON.stringify(payload));
      return res;
    };
  }

  if (typeof res.send !== 'function') {
    res.send = (payload) => {
      if (payload === undefined || payload === null) {
        res.end('');
        return res;
      }
      if (Buffer.isBuffer(payload)) {
        res.end(payload);
        return res;
      }
      if (typeof payload === 'object') {
        if (!res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', 'application/json');
        }
        res.end(JSON.stringify(payload));
        return res;
      }
      res.end(String(payload));
      return res;
    };
  }

  return res;
}

async function parseJsonBody(req, maxBytes = 2 * 1024 * 1024) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      const error = new Error('Payload too large.');
      error.status = 413;
      throw error;
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('Invalid JSON body.');
    error.status = 400;
    throw error;
  }
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.statusCode = 400;
      res.end('Missing request URL.');
      return;
    }

    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const route = ROUTES.get(url.pathname);
    if (!route) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Unknown local API route.' }));
      return;
    }

    req.query = parseQuery(url.searchParams);
    if (route.parseJson && !['GET', 'HEAD', 'OPTIONS'].includes(String(req.method || 'GET').toUpperCase())) {
      const contentType = String(req.headers['content-type'] || '').toLowerCase();
      req.body = contentType.includes('application/json')
        ? await parseJsonBody(req, route.maxBytes)
        : {};
    }

    const response = decorateResponse(res);
    await route.handler(req, response);
  } catch (error) {
    const status = Number.isFinite(error?.status) ? error.status : 500;
    const message = error instanceof Error ? error.message : String(error);
    console.error('[local-api] Unhandled error:', message);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'LOCAL_API_ERROR', message }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[local-api] listening on http://${HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`[local-api] shutting down on ${signal}...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
