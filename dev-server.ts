import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock Next.js Request/Response for development
class MockNextRequest {
  constructor(public req: express.Request) {}
  
  get url() { return this.req.url; }
  get method() { return this.req.method; }
  
  async json() { return this.req.body; }
  
  nextUrl = {
    searchParams: new URLSearchParams(this.req.url?.split('?')[1] || '')
  };
}

class MockNextResponse {
  constructor(public res: express.Response) {}
  
  static json(data: any, options?: { status?: number }) {
    return { data, status: options?.status || 200 };
  }
}

// Simple API route handler
async function handleApiRoute(req: express.Request, res: express.Response, handler: any) {
  try {
    const mockReq = new MockNextRequest(req);
    const mockRes = new MockNextResponse(res);
    
    // Mock global objects for Vercel environment
    (global as any).NextRequest = MockNextRequest;
    (global as any).NextResponse = MockNextResponse;
    
    const result = await handler(mockReq);
    
    if (result && typeof result === 'object') {
      if (result.status) {
        res.status(result.status);
      }
      res.json(result.data || result);
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const app = express();
app.use(express.json());

// Import and setup API routes
import('./api/auth/login.js').then(module => {
  app.post('/api/auth/login', (req, res) => handleApiRoute(req, res, module.default));
}).catch(console.error);

import('./api/auth/me.js').then(module => {
  app.get('/api/auth/me', (req, res) => handleApiRoute(req, res, module.default));
}).catch(console.error);

import('./api/auth/logout.js').then(module => {
  app.post('/api/auth/logout', (req, res) => handleApiRoute(req, res, module.POST));
}).catch(console.error);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Development server running' });
});

// Fallback for other API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not implemented in development mode' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Development API server running on http://localhost:${PORT}`);
});