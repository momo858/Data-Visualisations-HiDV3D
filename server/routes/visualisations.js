const db = require('../db');
const { sessions } = require('./auth');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

async function visualisationsHandler(req, res) {

  if (req.method === 'GET') {
    try {
      const token   = req.headers['x-auth-token'];
      const session = token ? sessions.get(token) : null;

      if (!session) {
        res.writeHead(401);
        return res.end(JSON.stringify({ error: 'Login required' }));
      }

      const result = await db.query(
        `SELECT v.*, d.name AS dataset_name,
                ROW_NUMBER() OVER (ORDER BY v.created_at ASC) AS save_number
         FROM visualisations v
         LEFT JOIN datasets d ON v.dataset_id = d.id
         WHERE v.user_id = $1
         ORDER BY v.created_at DESC`,
        [session.userId]
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

  if (req.method === 'POST') {
    try {
      const token   = req.headers['x-auth-token'];
      const session = token ? sessions.get(token) : null;

      const body = await readBody(req);
      const { dataset_id, x_col, y_col, z_col, color_col, camera_pos } = body;

      if (!dataset_id || !x_col || !y_col || !z_col) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'dataset_id, x_col, y_col, z_col are required' }));
      }

      const result = await db.query(
        `INSERT INTO visualisations (dataset_id, x_col, y_col, z_col, color_col, camera_pos, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          dataset_id, x_col, y_col, z_col,
          color_col || null,
          camera_pos ? JSON.stringify(camera_pos) : null,
          session ? session.userId : null
        ]
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

  if (req.method === 'DELETE') {
    try {
      const token   = req.headers['x-auth-token'];
      const session = token ? sessions.get(token) : null;
      const id      = req.url.split('/').pop();

      if (!session) {
        res.writeHead(401);
        return res.end(JSON.stringify({ error: 'Login required' }));
      }

      const result = await db.query(
        'DELETE FROM visualisations WHERE id = $1 AND user_id = $2',
        [id, session.userId]
      );

      if (result.rowCount === 0) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: 'Visualisation not found or not yours' }));
      }

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