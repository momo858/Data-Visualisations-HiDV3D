const db = require('../db');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end',  () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

async function datasetsHandler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await db.query('SELECT * FROM datasets ORDER BY created_at DESC');
      res.writeHead(200);
      res.end(JSON.stringify(result.rows));
    } catch (err) {
      console.error('GET /api/datasets error:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to fetch datasets' }));
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { name, filename, row_count, columns } = body;

      if (!name || !filename) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'name and filename are required' }));
        return;
      }

      const result = await db.query(
        'INSERT INTO datasets (name, filename, row_count, columns) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, filename, row_count || 0, columns || []]
      );
      res.writeHead(201);
      res.end(JSON.stringify(result.rows[0]));
    } catch (err) {
      console.error('POST /api/datasets error:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to save dataset' }));
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      const id = req.url.split('/').pop();
      await db.query('DELETE FROM datasets WHERE id = $1', [id]);
      res.writeHead(200);
      res.end(JSON.stringify({ message: 'Dataset deleted' }));
    } catch (err) {
      console.error('DELETE /api/datasets error:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to delete dataset' }));
    }
    return;
  }

  res.writeHead(405);
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}

module.exports = datasetsHandler;