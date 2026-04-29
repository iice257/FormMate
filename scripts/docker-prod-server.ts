// @ts-nocheck
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import express from 'express';
import chatHandler from '../api/ai/chat.ts';
import transcribeHandler from '../api/ai/transcribe.ts';
import visionContextHandler from '../api/ai/vision-context.ts';
import imageExtractHandler from '../api/parser/image-extract.ts';
import scrapeHandler from '../api/proxy/scrape.ts';
import googleFormHandler from '../api/proxy/google-form.ts';
import healthHandler from '../api/health.ts';

loadDotenv({ path: '.env.local' });
loadDotenv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const host = String(process.env.FORMMATE_DOCKER_HOST || '0.0.0.0').trim() || '0.0.0.0';
const parsedPort = Number.parseInt(String(process.env.FORMMATE_DOCKER_PORT || ''), 10);
const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 8080;
const strictTls = String(process.env.FORMMATE_STRICT_TLS || '').trim() === '1';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = strictTls ? '1' : '0';

const app = express();
const json2mb = express.json({ limit: '2mb' });
const json22mb = express.json({ limit: '22mb' });

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.all('/api/health', healthHandler);
app.all('/api/ai/chat', json2mb, chatHandler);
app.all('/api/ai/vision-context', json22mb, visionContextHandler);
app.all('/api/parser/image-extract', json22mb, imageExtractHandler);
app.all('/api/ai/transcribe', transcribeHandler);
app.all('/api/proxy/scrape', scrapeHandler);
app.all('/api/proxy/google-form', googleFormHandler);

app.use(express.static(distDir, {
  etag: true,
  maxAge: '1h',
  setHeaders(res, filePath) {
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

app.use((_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, host, () => {
  console.log(`[docker-prod] FormMate listening on http://${host}:${port}`);
});
