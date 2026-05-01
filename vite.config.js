import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-api-plugin',
      configureServer(server) {
        server.middlewares.use('/api/words', (req, res, next) => {
          // Store data in a different folder outside the app source code
          const dataDir = path.resolve(__dirname, '../hindi-vocab-data');
          const dataPath = path.join(dataDir, 'words.json');
          
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          if (!fs.existsSync(dataPath)) {
            fs.writeFileSync(dataPath, '[]');
          }

          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(fs.readFileSync(dataPath));
          } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              fs.writeFileSync(dataPath, body);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            });
          } else {
            next();
          }
        });
      }
    }
  ],
})
