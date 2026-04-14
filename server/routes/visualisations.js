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

async function visualisationsHandler(req, res) {
  // GET /api/visualisations — return all saved visualisations
  if (req.method === 'GET') {
    try {
      const result = await db.query(
        `SELECT v.*, d.name AS dataset_name
         FROM visualisations v
         LEFT JOIN datasets d ON v.dataset_id = d.id
         ORDER BY v.created_at DESC`
      );
      res.writeHead(200);
      res.end(JSON.stringify(result.rows));
    } catch (err) {
      console.error('GET /api/visualisations error:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to fetch visualisations' }));
    }
    return;
  }

  // POST /api/visualisations — save axis mapping + camera position
  if (req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { dataset_id, x_col, y_col, z_col, camera_pos } = body;

      if (!dataset_id || !x_col || !y_col || !z_col) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'dataset_id, x_col, y_col, z_col are required' }));
        return;
      }

      const result = await db.query(
        'INSERT INTO visualisations (dataset_id, x_col, y_col, z_col, camera_pos) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [dataset_id, x_col, y_col, z_col, camera_pos ? JSON.stringify(camera_pos) : null]
      );
      res.writeHead(201);
      res.end(JSON.stringify(result.rows[0]));
    } catch (err) {
      console.error('POST /api/visualisations error:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to save visualisation' }));
    }
    return;
  }

  // DELETE /api/visualisations/:id
  if (req.method === 'DELETE') {
    try {
      const id = req.url.split('/').pop();
      await db.query('DELETE FROM visualisations WHERE id = $1', [id]);
      res.writeHead(200);
      res.end(JSON.stringify({ message: 'Visualisation deleted' }));
    } catch (err) {
      console.error('DELETE /api/visualisations error:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to delete visualisation' }));
    }
    return;
  }

  res.writeHead(405);
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}

module.exports = visualisationsHandler;
