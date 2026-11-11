const crypto = require('crypto');
const http = require('http');
const https = require('https');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const CircuitBreaker = require('./circuit-breaker');
const openapiSpecification = require('./openapi');
const { procesarConsultaAsistenteIA } = require('./ai-assistant');

const app = express();
app.use(
  cors({
    exposedHeaders: [
      'X-Trace-ID',
      'X-Ventas-Instance',
      'X-Idempotent-Replay',
      'X-Circuit-State',
    ],
  }),
);
app.use(express.json());

const PORT = process.env.PORT || 8080;
const IDENTITY_SERVICE_URL =
  process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';

// ADR-01: Soporte de múltiples instancias para el Servidor de Ventas (Balanceo de carga Round-Robin)
const VENTAS_URLS = (
  process.env.VENTAS_SERVICE_URLS || 'http://localhost:3002'
)
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

let roundRobinIndex = 0;
function getNextVentasInstanceUrl() {
  const url = VENTAS_URLS[roundRobinIndex % VENTAS_URLS.length];
  roundRobinIndex = (roundRobinIndex + 1) % VENTAS_URLS.length;
  return url;
}

// Circuit Breakers con los parámetros del TP3-1 (3s timeout, 30s recuperación)
const identityBreaker = new CircuitBreaker('identity-service', {
  timeoutMs: 3000,
  failureThreshold: 2,
  recoveryTimeMs: 30000,
});

const ventasBreaker = new CircuitBreaker('ventas-service', {
  timeoutMs: 3000,
  failureThreshold: 2,
  recoveryTimeMs: 30000,
});

// Caché local de la clave pública JWKS de Identidad (ADR-08)
let cachedPublicKeyPem = null;

async function fetchPublicKeyFromJwks() {
  if (cachedPublicKeyPem) {
    return cachedPublicKeyPem;
  }

  const response = await identityBreaker.execute((signal) =>
    fetch(`${IDENTITY_SERVICE_URL}/api/v1/auth/jwks`, { signal }),
  );
  const data = await response.json();
  const keyEntry = data?.keys?.[0];
  if (!keyEntry) {
    throw new Error('JWKS vacío o inválido');
  }

  if (keyEntry.publicKeyPem) {
    cachedPublicKeyPem = keyEntry.publicKeyPem;
  } else {
    const keyObj = crypto.createPublicKey({ key: keyEntry, format: 'jwk' });
    cachedPublicKeyPem = keyObj
      .export({ type: 'spki', format: 'pem' })
      .toString();
  }
  console.log('[api-gateway] Clave pública JWKS cacheada exitosamente.');
  return cachedPublicKeyPem;
}

// Precargar JWKS en background al iniciar
setTimeout(() => {
  fetchPublicKeyFromJwks().catch(() => {});
}, 2000);

/**
 * 1. Middleware de Trazabilidad Distribuida (X-Trace-ID) - TP3-1 pág. 58
 */
app.use((req, res, next) => {
  const traceId = req.headers['x-trace-id'] || crypto.randomUUID();
  req.traceId = traceId;
  res.setHeader('X-Trace-ID', traceId);
  const start = Date.now();

  res.on('finish', () => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        service: 'api-gateway',
        traceId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      }),
    );
  });
  next();
});

/**
 * 2. Rate Limiter por IP y usuario en inicio de sesión - TP3-1 pág. 58
 */
const loginRateMap = new Map();
const RATE_WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_LOGIN_ATTEMPTS = 15;

function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userKey = req.body?.username || req.body?.email || 'anon';
  const key = `${ip}:${userKey}`;
  const now = Date.now();

  const record = loginRateMap.get(key) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + RATE_WINDOW_MS;
  }
  record.count += 1;
  loginRateMap.set(key, record);

  if (record.count > MAX_LOGIN_ATTEMPTS) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message:
        'Se superó el límite de intentos de inicio de sesión para este usuario/IP. Intente nuevamente en un minuto.',
      traceId: req.traceId,
    });
  }
  next();
}

/**
 * 3. Middleware de Validación de JWT y Autorización en el API Gateway (ADR-04, ADR-08, pág. 58-59)
 */
async function validateJwtMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token ausente o formato inválido (validado en API Gateway).',
      traceId: req.traceId,
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const pubKey = await fetchPublicKeyFromJwks();
    const payload = jwt.verify(token, pubKey, { algorithms: ['RS256'] });
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token vencido o con firma inválida (validado en API Gateway).',
      traceId: req.traceId,
    });
  }
}

function requireAdminMiddleware(req, res, next) {
  const rol = String(req.user?.rol || '').trim().toLowerCase();
  if (rol !== 'administrador' && rol !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Acceso denegado: se requieren permisos de administrador (RF-04).',
      traceId: req.traceId,
    });
  }
  next();
}

/**
 * Función de reenvío HTTP (Reverse Proxy) protegida con Circuit Breaker
 */
async function proxyRequest(req, res, targetBaseUrl, breaker) {
  const targetUrl = `${targetBaseUrl}${req.originalUrl}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Trace-ID': req.traceId,
  };

  if (req.headers['authorization']) {
    headers['Authorization'] = req.headers['authorization'];
  }
  if (req.headers['idempotency-key']) {
    headers['Idempotency-Key'] = req.headers['idempotency-key'];
  }

  const fetchOptions = {
    method: req.method,
    headers,
  };

  if (!['GET', 'HEAD'].includes(req.method) && req.body) {
    fetchOptions.body = JSON.stringify(req.body);
  }

  try {
    const upstreamRes = await breaker.execute((signal) =>
      fetch(targetUrl, { ...fetchOptions, signal }),
    );

    res.setHeader('X-Circuit-State', breaker.state);

    const ventasInstance = upstreamRes.headers.get('x-ventas-instance');
    if (ventasInstance) {
      res.setHeader('X-Ventas-Instance', ventasInstance);
    }
    const idempotentReplay = upstreamRes.headers.get('x-idempotent-replay');
    if (idempotentReplay) {
      res.setHeader('X-Idempotent-Replay', idempotentReplay);
    }

    const text = await upstreamRes.text();
    let jsonBody;
    try {
      jsonBody = JSON.parse(text);
    } catch (_) {
      jsonBody = { raw: text };
    }

    return res.status(upstreamRes.status).json(jsonBody);
  } catch (err) {
    res.setHeader('X-Circuit-State', breaker.state);
    return res.status(503).json({
      error: 'Service Unavailable',
      message: err.message,
      circuitBreaker: breaker.getStatus(),
      traceId: req.traceId,
    });
  }
}

/**
 * Endpoints de estado y observabilidad del API Gateway y sus Circuit Breakers
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    jwksCached: Boolean(cachedPublicKeyPem),
    ventasInstances: VENTAS_URLS,
    circuitBreakers: {
      identity: identityBreaker.getStatus(),
      ventas: ventasBreaker.getStatus(),
    },
  });
});

app.get('/api/v1/gateway/status', (req, res) => {
  res.json({
    gateway: 'active',
    traceId: req.traceId,
    jwksPublicKeyCached: Boolean(cachedPublicKeyPem),
    openApiSpecUrl: '/api/v1/openapi.json',
    swaggerDocsUrl: '/api/v1/docs',
    loadBalancer: {
      strategy: 'round-robin',
      instances: VENTAS_URLS,
    },
    circuitBreakers: {
      identity: identityBreaker.getStatus(),
      ventas: ventasBreaker.getStatus(),
    },
  });
});

/**
 * Contratos estandarizados OpenAPI 3 publicados bajo /api/v1 (TP3-1 Sección 2, pág. 52 y 67)
 */
app.get('/api/v1/openapi.json', (req, res) => {
  res.status(200).json(openapiSpecification);
});

app.get('/api/v1/docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Contratos SOA OpenAPI 3 — UCH-FyD (NEXO / NOVA Shop)</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body style="margin:0; background:#f8fafc;">
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        dom_id: '#swagger-ui',
      });
    };
  </script>
</body>
</html>`);
});

/**
 * Enrutamiento hacia Servicio de Identidad (/api/v1/auth/* y /api/v1/usuarios/*)
 */
app.post('/api/v1/auth/login', loginRateLimiter, (req, res) => {
  return proxyRequest(req, res, IDENTITY_SERVICE_URL, identityBreaker);
});

app.post('/api/v1/auth/registro', (req, res) => {
  return proxyRequest(req, res, IDENTITY_SERVICE_URL, identityBreaker);
});

app.get('/api/v1/auth/jwks', (req, res) => {
  return proxyRequest(req, res, IDENTITY_SERVICE_URL, identityBreaker);
});

app.all('/api/v1/usuarios*', validateJwtMiddleware, requireAdminMiddleware, (req, res) => {
  return proxyRequest(req, res, IDENTITY_SERVICE_URL, identityBreaker);
});

app.all('/usuarios*', validateJwtMiddleware, requireAdminMiddleware, (req, res) => {
  return proxyRequest(req, res, IDENTITY_SERVICE_URL, identityBreaker);
});

/**
 * Enrutamiento hacia Balanceador del Servidor de Ventas (/api/v1/articulos/* y /api/v1/pedidos/*)
 */
// Consulta pública o autenticada de catálogo
app.get('/api/v1/articulos*', (req, res) => {
  const target = getNextVentasInstanceUrl();
  return proxyRequest(req, res, target, ventasBreaker);
});

// Operaciones protegidas de catálogo (PUT, PATCH requieren JWT válido)
app.all('/api/v1/articulos*', validateJwtMiddleware, (req, res) => {
  const target = getNextVentasInstanceUrl();
  return proxyRequest(req, res, target, ventasBreaker);
});

// Operaciones de pedidos (POST, GET requieren JWT válido)
app.all('/api/v1/pedidos*', validateJwtMiddleware, (req, res) => {
  const target = getNextVentasInstanceUrl();
  return proxyRequest(req, res, target, ventasBreaker);
});

/**
 * Servicio de Inteligencia Artificial SOA (/api/v1/ia/asistente)
 * Consulta en tiempo real el catálogo de Ventas vía Circuit Breaker + Load Balancer y aplica RAG
 */
app.post('/api/v1/ia/asistente', async (req, res) => {
  try {
    const mensaje = req.body?.mensaje || '';
    const target = getNextVentasInstanceUrl();

    const resultado = await procesarConsultaAsistenteIA({
      mensaje,
      obtenerCatalogoFn: async () => {
        const upstreamRes = await ventasBreaker.execute((signal) =>
          fetch(`${target}/api/v1/articulos`, {
            headers: { 'X-Trace-ID': req.traceId },
            signal,
          }),
        );
        const ventasInstance = upstreamRes.headers.get('x-ventas-instance');
        if (ventasInstance) {
          res.setHeader('X-Ventas-Instance', ventasInstance);
        }
        const data = await upstreamRes.json();
        return Array.isArray(data) ? data : [];
      },
    });

    res.setHeader('X-Circuit-State', ventasBreaker.state);
    return res.status(200).json({
      ...resultado,
      traceId: req.traceId,
    });
  } catch (err) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: `El asistente IA no pudo consultar el catálogo en este momento: ${err.message}`,
      traceId: req.traceId,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[api-gateway] Punto único de entrada SOA escuchando en puerto ${PORT}`);
  console.log(`[api-gateway] -> Identidad: ${IDENTITY_SERVICE_URL}`);
  console.log(`[api-gateway] -> Ventas (Round-Robin): ${VENTAS_URLS.join(', ')}`);
});
