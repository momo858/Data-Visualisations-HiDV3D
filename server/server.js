require('dotenv').config();
const http = require('http');
const datasetsHandler       = require('./routes/datasets');
const visualisationsHandler = require('./routes/visualisations');
const { authHandler }       = require('./routes/auth');
const { initDB }            = require('./db');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-auth-token');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(`${req.method} ${req.url}`);

  if (req.url.startsWith('/api/auth'))          return authHandler(req, res);
  if (req.url.startsWith('/api/datasets'))       return datasetsHandler(req, res);
  if (req.url.startsWith('/api/visualisations')) return visualisationsHandler(req, res);

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Route not found' }));
});

// Wait for DB to be ready before accepting requests
initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`HIDV3D server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialise database:', err.message);
  process.exit(1);
});