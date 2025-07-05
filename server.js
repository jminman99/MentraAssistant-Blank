import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware for parsing JSON
app.use(express.json());

// Import and use API routes
const apiFiles = [
  'api/auth/me.js',
  'api/auth/login.js', 
  'api/auth/logout.js',
  'api/chat/index.js',
  'api/chat/ai-response.js',
  'api/mentors/index.js',
  'api/human-mentors/index.js',
  'api/council-bookings/index.js',
  'api/council-sessions/book.js',
  'api/ai-mentors/index.js',
  'api/health.js'
];

// Dynamic route mounting
for (const file of apiFiles) {
  try {
    const route = file.replace('api/', '/api/').replace('/index.js', '').replace('.js', '');
    const { default: handler } = await import('./' + file);
    app.all(route, handler);
    app.all(route + '/*', handler);
    console.log(`Mounted API route: ${route}`);
  } catch (error) {
    console.warn(`Failed to mount ${file}:`, error.message);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});