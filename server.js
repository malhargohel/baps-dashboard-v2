import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Proxy /api/anthropic → api.anthropic.com
app.use('/api/anthropic', createProxyMiddleware({
  target: 'https://api.anthropic.com',
  changeOrigin: true,
  pathRewrite: { '^/api/anthropic': '' },
  on: {
    proxyReq: (proxyReq, req) => {
      // Forward body
      if (req.body) {
        const body = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(body));
        proxyReq.write(body);
      }
    }
  }
}));

// Serve built frontend
app.use(express.static(join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
