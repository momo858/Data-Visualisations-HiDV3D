require('dotenv').config();
const http = require('http');
const fs   = require('fs');
const path = require('path');
const datasetsHandler       = require('./routes/datasets');
const visualisationsHandler = require('./routes/visualisations');
const { authHandler }       = require('./routes/auth');
const { initDB }            = require('./db');

const PORT = process.env.PORT || 3000;

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.bin':  'application/octet-stream',
    '.yaml': 'text/yaml',
    '.yml':  'text/yaml',
  };
  return types[ext] || 'text/plain';
}

const frontendPath = path.join('/HIDV3D');


const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-auth-token');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(`${req.method} ${req.url}`);

  // ── API routes ────────────────────────────────────────
  if (req.url.startsWith('/api/auth'))          return authHandler(req, res);
  if (req.url.startsWith('/api/datasets'))       return datasetsHandler(req, res);
  if (req.url.startsWith('/api/visualisations')) return visualisationsHandler(req, res);

  // ── Serve frontend static files ───────────────────────
  let filePath = req.url === '/' ? '/index.html' : req.url;
  const fullPath = path.join(frontendPath, filePath);

  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const contentType = getContentType(fullPath);
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(fullPath).pipe(res);
  });
});

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`HIDV3D server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialise database:', err.message);
  process.exit(1);
});