const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '0.0.0.0';
const PORT = 3000;
const ROOT_DIR = __dirname;
const HISTORY_DIR = path.join(ROOT_DIR, 'chat_history');

// Fixed credentials per user. Update these as needed.
const USERS = {
  Anish: 'anish123',
  Riya: 'riya123',
  Arjun: 'arjun123'
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
  });
}

function sanitizeName(name) {
  return String(name || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function isAuthorized(name, password) {
  return Object.prototype.hasOwnProperty.call(USERS, name) && USERS[name] === password;
}

function getHistoryPath(name) {
  return path.join(HISTORY_DIR, sanitizeName(name) + '.json');
}

function readHistory(name) {
  const historyPath = getHistoryPath(name);
  if (!fs.existsSync(historyPath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(historyPath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeHistory(name, history) {
  const historyPath = getHistoryPath(name);
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

function handleApi(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  parseJsonBody(req)
    .then((body) => {
      const { name, password } = body;

      if (req.url === '/api/login') {
        if (!isAuthorized(name, password)) {
          sendJson(res, 401, { error: 'Invalid name or password' });
          return;
        }
        sendJson(res, 200, { ok: true });
        return;
      }

      if (!isAuthorized(name, password)) {
        sendJson(res, 401, { error: 'Invalid name or password' });
        return;
      }

      if (req.url === '/api/history') {
        const history = readHistory(name);
        sendJson(res, 200, { history });
        return;
      }

      if (req.url === '/api/message') {
        const message = String(body.message || '').trim();
        if (!message) {
          sendJson(res, 400, { error: 'Message cannot be empty' });
          return;
        }

        const history = readHistory(name);
        history.push({
          sender: name,
          message,
          timestamp: new Date().toISOString()
        });
        writeHistory(name, history);
        sendJson(res, 200, { ok: true, history });
        return;
      }

      sendJson(res, 404, { error: 'API route not found' });
    })
    .catch((error) => {
      sendJson(res, 400, { error: error.message });
    });
}

function serveStatic(req, res) {
  const safePath = path.normalize(decodeURIComponent(req.url.split('?')[0]));
  let filePath = safePath === '/' ? '/index.html' : safePath;

  if (filePath.includes('..')) {
    sendJson(res, 400, { error: 'Invalid path' });
    return;
  }

  const absolutePath = path.join(ROOT_DIR, filePath);

  fs.stat(absolutePath, (err, stat) => {
    if (err || !stat.isFile()) {
      sendJson(res, 404, { error: 'File not found' });
      return;
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(absolutePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    handleApi(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Secure chat server running at http://${HOST}:${PORT}`);
  console.log('Login users configured:', Object.keys(USERS).join(', '));
});
