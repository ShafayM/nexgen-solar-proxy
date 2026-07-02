const http = require('http');
const https = require('https');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const PORT = process.env.PORT || 3000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function proxyToClaude(body, res) {
  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      Object.entries(CORS_HEADERS).forEach(([k,v]) => res.setHeader(k, v));
      res.statusCode = apiRes.statusCode;
      res.end(data);
    });
  });

  req.on('error', (e) => {
    Object.entries(CORS_HEADERS).forEach(([k,v]) => res.setHeader(k, v));
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  });

  req.write(body);
  req.end();
}

const server = http.createServer((req, res) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([k,v]) => res.setHeader(k, v));
    res.statusCode = 204;
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/') {
    Object.entries(CORS_HEADERS).forEach(([k,v]) => res.setHeader(k, v));
    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'NexGen Solar API proxy running', version: '1.0' }));
    return;
  }

  // Claude proxy endpoint
  if (req.method === 'POST' && req.url === '/api/chat') {
    if (!ANTHROPIC_API_KEY) {
      Object.entries(CORS_HEADERS).forEach(([k,v]) => res.setHeader(k, v));
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set on server' }));
      return;
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => proxyToClaude(body, res));
    return;
  }

  Object.entries(CORS_HEADERS).forEach(([k,v]) => res.setHeader(k, v));
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`NexGen Solar proxy running on port ${PORT}`);
});
