const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { parseBody, sendJson } = require('./lib/http-utils');
const { requireAuth, requireRole } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml'
};

function serveStatic(req, res, pathname) {
  const safePath = path.normalize(pathname === '/' ? '/index.html' : pathname);
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (!pathname.startsWith('/api/')) {
    return serveStatic(req, res, pathname);
  }

  let body = {};
  if (method === 'POST' || method === 'PUT') {
    try {
      body = await parseBody(req);
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid request body.' });
    }
  }

  // ---------- AUTH ----------
  if (pathname === '/api/auth/register' && method === 'POST') {
    return authRoutes.register(req, res, body);
  }
  if (pathname === '/api/auth/login' && method === 'POST') {
    return authRoutes.login(req, res, body);
  }
  if (pathname === '/api/auth/users' && method === 'GET') {
    const user = requireAuth(req, res); if (!user) return;
    if (!requireRole(user, res, 'Admin')) return;
    return authRoutes.listUsers(req, res);
  }

  // ---------- BOOKS ----------
  if (pathname === '/api/books' && method === 'GET') {
    const user = requireAuth(req, res); if (!user) return;
    return bookRoutes.getAll(req, res);
  }
  if (pathname === '/api/books/search' && method === 'GET') {
    const user = requireAuth(req, res); if (!user) return;
    return bookRoutes.search(req, res, parsed.query);
  }
  if (pathname === '/api/books/report/summary' && method === 'GET') {
    const user = requireAuth(req, res); if (!user) return;
    if (!requireRole(user, res, 'Librarian', 'Admin')) return;
    return bookRoutes.report(req, res);
  }
  if (pathname === '/api/books' && method === 'POST') {
    const user = requireAuth(req, res); if (!user) return;
    if (!requireRole(user, res, 'Librarian', 'Admin')) return;
    return bookRoutes.add(req, res, body);
  }

  let m;
  if ((m = pathname.match(/^\/api\/books\/([^/]+)$/)) && method === 'PUT') {
    const user = requireAuth(req, res); if (!user) return;
    if (!requireRole(user, res, 'Librarian', 'Admin')) return;
    return bookRoutes.update(req, res, decodeURIComponent(m[1]), body);
  }
  if ((m = pathname.match(/^\/api\/books\/([^/]+)$/)) && method === 'DELETE') {
    const user = requireAuth(req, res); if (!user) return;
    if (!requireRole(user, res, 'Admin')) return;
    return bookRoutes.remove(req, res, decodeURIComponent(m[1]));
  }
  if ((m = pathname.match(/^\/api\/books\/([^/]+)\/issue$/)) && method === 'POST') {
    const user = requireAuth(req, res); if (!user) return;
    if (!requireRole(user, res, 'Teacher', 'Librarian', 'Admin')) return;
    return bookRoutes.issue(req, res, decodeURIComponent(m[1]));
  }
  if ((m = pathname.match(/^\/api\/books\/([^/]+)\/return$/)) && method === 'POST') {
    const user = requireAuth(req, res); if (!user) return;
    if (!requireRole(user, res, 'Teacher', 'Librarian', 'Admin')) return;
    return bookRoutes.returnBook(req, res, decodeURIComponent(m[1]));
  }

  sendJson(res, 404, { error: 'Route not found.' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`SAIF LIBRARY running at http://localhost:${PORT}`);
});
