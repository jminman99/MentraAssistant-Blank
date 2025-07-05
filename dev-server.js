import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware for parsing JSON and handling CORS
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Dynamically load and serve API routes
async function loadApiRoutes() {
  const apiDir = path.join(__dirname, 'api');
  
  // Recursively find all .ts files in api directory
  function findApiFiles(dir, basePath = '') {
    const files = fs.readdirSync(dir);
    const routes = [];
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.startsWith('_')) {
        routes.push(...findApiFiles(fullPath, `${basePath}/${file}`));
      } else if (file.endsWith('.ts') && file !== 'index.ts') {
        const routePath = `${basePath}/${file.replace('.ts', '')}`;
        routes.push({ file: fullPath, route: routePath });
      } else if (file === 'index.ts') {
        routes.push({ file: fullPath, route: basePath || '/' });
      }
    }
    
    return routes;
  }
  
  const apiFiles = findApiFiles(apiDir);
  
  for (const { file, route } of apiFiles) {
    try {
      // Dynamic import with cache busting for development
      const moduleUrl = `file://${file}?update=${Date.now()}`;
      const module = await import(moduleUrl);
      const handler = module.default;
      
      if (typeof handler === 'function') {
        const routePath = `/api${route}`;
        
        app.all(routePath, async (req, res) => {
          try {
            console.log(`Handling ${req.method} ${routePath}`);
            
            // Convert Express req/res to Vercel format
            const vercelReq = {
              ...req,
              query: req.query,
              body: req.body,
              cookies: req.cookies,
              headers: req.headers,
              method: req.method,
              url: req.url
            };
            
            const vercelRes = {
              status: (code) => {
                res.status(code);
                return vercelRes;
              },
              json: (data) => {
                res.json(data);
                return vercelRes;
              },
              send: (data) => {
                res.send(data);
                return vercelRes;
              },
              setHeader: (name, value) => {
                res.setHeader(name, value);
                return vercelRes;
              }
            };
            
            await handler(vercelReq, vercelRes);
          } catch (error) {
            console.error(`Error in ${routePath}:`, error);
            res.status(500).json({ error: 'Internal server error', details: error.message });
          }
        });
        
        console.log(`✓ Loaded API route: ${routePath}`);
      }
    } catch (error) {
      console.error(`Failed to load ${file}:`, error);
    }
  }
}

// Load API routes
loadApiRoutes().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Development API server running on http://localhost:${PORT}`);
    console.log(`📡 Ready to proxy API requests from Vite dev server`);
  });
}).catch(error => {
  console.error('Failed to start API server:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  process.exit(0);
});