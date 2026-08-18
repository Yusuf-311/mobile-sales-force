'use strict';

const http = require('http');
const url = require('url');
const logger = require('./utils/logger');
const { authenticate } = require('./middleware/auth');
const { HttpError, NotFound } = require('./utils/errors');

const mclHandler = require('./routes/mcl');
const callListHandler = require('./routes/callList');
const callPlanHandler = require('./routes/callPlan');
const callActualHandler = require('./routes/callActual');

// Helper to parse JSON body
function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new HttpError(400, 'Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Extend response object
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  try {
    const parsedUrl = url.parse(req.url, true);
    let path = parsedUrl.pathname;
    // Normalize trailing slash
    if (path.endsWith('/') && path.length > 1) {
      path = path.slice(0, -1);
    }
    const method = req.method;

    // Health check
    if (method === 'GET' && path === '/health') {
      logger.info(`Health check requested`, { method, path });
      return res.status(200).json({ status: 'ok' });
    }

    if (path.startsWith('/api/')) {
      logger.info(`Incoming Request`, { method, path });
      
      // Parse body for non-GET requests
      if (['POST', 'PATCH', 'PUT'].includes(method)) {
        req.body = await parseJSONBody(req);
      }

      // Authentication
      await authenticate(req);

      const pathSegments = path.replace(/^\/api\//, '').split('/').filter(Boolean);
      const resource = pathSegments[0];
      const subSegments = pathSegments.slice(1);

      if (resource === 'mcl' || resource === 'products') {
        await mclHandler(req, res, resource, subSegments);
      } else if (resource === 'call-lists') {
        await callListHandler(req, res, subSegments);
      } else if (resource === 'call-plans') {
        await callPlanHandler(req, res, subSegments);
      } else if (resource === 'call-actuals') {
        await callActualHandler(req, res, subSegments);
      } else {
        throw NotFound();
      }
    } else {
        throw NotFound();
    }

  } catch (err) {
    if (err instanceof HttpError) {
      logger.error(`HTTP Error`, { method: req.method, path: req.url, status: err.statusCode, message: err.message });
      const payload = { status: 'error', message: err.message };
      if (err.code) payload.code = err.code;
      if (err.details) payload.details = err.details;
      return res.status(err.statusCode).json(payload);
    }

    // Postgres / DB error (best-effort detection)
    if (err && err.code && typeof err.code === 'string' && err.code.length === 5) {
      logger.error('Database Error', { method: req.method, path: req.url, code: err.code, error: err });
      return res.status(500).json({ status: 'error', message: 'Database error', details: err.message });
    }

    logger.error('Unhandled Internal Error', { method: req.method, path: req.url, error: err });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

module.exports = server;
