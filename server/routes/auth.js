const db     = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// In-memory session store: token → { userId, username }
const sessions = new Map();

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

async function authHandler(req, res) {

  // ── POST /api/auth/register ──────────────────────────
  if (req.method === 'POST' && req.url === '/api/auth/register') {
    const { username, email, password } = await readBody(req);

    if (!username || !email || !password) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'Username, email and password are all required' }));
    }
    if (password.length < 6) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'Password must be at least 6 characters' }));
    }

    try {
      const hash   = await bcrypt.hash(password, 12);
      const result = await db.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
        [username.trim(), email.trim().toLowerCase(), hash]
      );
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, { userId: result.rows[0].id, username: result.rows[0].username });
      res.writeHead(201);
      res.end(JSON.stringify({ token, username: result.rows[0].username }));
    } catch (err) {
      // Postgres unique violation code = 23505
      if (err.code === '23505') {
        res.writeHead(409);
        return res.end(JSON.stringify({ error: 'Username or email already taken' }));
      }
      console.error('Register error:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Registration failed' }));
    }
    return;
  }

  // ── POST /api/auth/login ─────────────────────────────
  if (req.method === 'POST' && req.url === '/api/auth/login') {
    const { email, password } = await readBody(req);

    if (!email || !password) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'Email and password are required' }));
    }

    try {
      const result = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email.trim().toLowerCase()]
      );
      const user = result.rows[0];

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        res.writeHead(401);
        return res.end(JSON.stringify({ error: 'Invalid email or password' }));
      }

      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, { userId: user.id, username: user.username });
      res.writeHead(200);
      res.end(JSON.stringify({ token, username: user.username }));
    } catch (err) {
      console.error('Login error:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Login failed' }));
    }
    return;
  }

  // ── POST /api/auth/logout ────────────────────────────
  if (req.method === 'POST' && req.url === '/api/auth/logout') {
    const token = req.headers['x-auth-token'];
    if (token) sessions.delete(token);
    res.writeHead(200);
    res.end(JSON.stringify({ message: 'Logged out' }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Auth route not found' }));
}

module.exports = { authHandler, sessions };