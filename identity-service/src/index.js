const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const usuarioRepository = require('./repositories/usuario.repository');
const { getPrivateKey, getPublicKey, getJwks, KID } = require('./keys');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/novashop_identidad';

/**
 * Middleware de Trazabilidad Distribuida (X-Trace-ID) - TP3-1 Sección 4
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
        service: 'identity-service',
        traceId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      })
    );
  });
  next();
});

/**
 * Middleware de Autenticación y Autorización local para rutas de gestión de usuarios (RF-04, DRV-08)
 * Comprueba firma RS256, vencimiento y rol requerido en el backend.
 */
function isAdminRole(rol) {
  if (!rol) return false;
  const normalized = String(rol).trim().toLowerCase();
  return normalized === 'administrador' || normalized === 'admin';
}

function requireAuth(rolRequerido) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token ausente o formato inválido.',
        traceId: req.traceId,
      });
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, getPublicKey(), { algorithms: ['RS256'] });
      req.user = payload;

      if (rolRequerido === 'administrador' || rolRequerido === 'ADMIN') {
        if (!isAdminRole(payload.rol)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Acceso denegado: se requieren permisos de administrador (RF-04).',
            traceId: req.traceId,
          });
        }
      } else if (rolRequerido && payload.rol !== rolRequerido) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Se requiere el rol '${rolRequerido}' para realizar esta operación.`,
          traceId: req.traceId,
        });
      }
      next();
    } catch (err) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token vencido o con firma inválida.',
        traceId: req.traceId,
      });
    }
  };
}

/**
 * Health check y contrato OpenAPI
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'identity-service', dbState: mongoose.connection.readyState });
});

/**
 * 1. POST /api/v1/auth/registro
 * RF-01: Registro de usuarios mediante nombre o correo y contraseña.
 * RF-02: Creación de usuario registrado en estado inactivo.
 * SUP-06: Unicidad del nombre de usuario.
 */
app.post('/api/v1/auth/registro', async (req, res) => {
  try {
    const { username, email, password, nombreCliente } = req.body;
    const identificador = username || email;

    if (!identificador || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Debe proporcionar nombre de usuario (o correo) y contraseña.',
        traceId: req.traceId,
      });
    }

    const existente = await usuarioRepository.findByUsernameOrEmail(identificador);
    if (existente) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'El nombre de usuario o correo ya se encuentra registrado en el sistema (SUP-06).',
        traceId: req.traceId,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nuevoUsuario = await usuarioRepository.create({
      username: identificador.trim().toLowerCase(),
      email: email ? email.trim().toLowerCase() : undefined,
      nombreCliente: nombreCliente || identificador.trim(),
      passwordHash,
      rol: 'cliente',
      estado: 'inactivo', // RF-02: Inicialmente inactivo hasta que el administrador lo active
    });

    return res.status(201).json({
      id: nuevoUsuario._id,
      username: nuevoUsuario.username,
      nombreCliente: nuevoUsuario.nombreCliente,
      rol: nuevoUsuario.rol,
      estado: nuevoUsuario.estado,
      mensaje: 'Usuario registrado en estado inactivo. Un administrador debe activar la cuenta para poder iniciar sesión.',
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'El identificador de usuario ya existe en el sistema.',
        traceId: req.traceId,
      });
    }
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      traceId: req.traceId,
    });
  }
});

/**
 * 2. POST /api/v1/auth/login
 * RF-03: Autenticación de usuarios y emisión de JWT RS256 (15 minutos - ADR-08)
 */
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identificador = username || email;

    if (!identificador || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Debe enviar usuario/correo y contraseña.',
        traceId: req.traceId,
      });
    }

    const usuario = await usuarioRepository.findByUsernameOrEmail(identificador);
    if (!usuario) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Credenciales inválidas.',
        traceId: req.traceId,
      });
    }

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValida) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Credenciales inválidas.',
        traceId: req.traceId,
      });
    }

    if (usuario.estado !== 'activo') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'La cuenta se encuentra inactiva. Solicite su activación a un administrador (RF-04).',
        traceId: req.traceId,
      });
    }

    const payload = {
      sub: usuario._id.toString(),
      usuario: usuario.username,
      nombreCliente: usuario.nombreCliente,
      rol: usuario.rol,
      estado: usuario.estado,
    };

    const accessToken = jwt.sign(payload, getPrivateKey(), {
      algorithm: 'RS256',
      expiresIn: '15m', // ADR-08: Vencimiento en 15 minutos
      keyid: KID,
      issuer: 'urn:uch-fyd:identity-service',
    });

    return res.status(200).json({
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      usuario: {
        id: usuario._id,
        username: usuario.username,
        nombreCliente: usuario.nombreCliente,
        rol: usuario.rol,
        estado: usuario.estado,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      traceId: req.traceId,
    });
  }
});

/**
 * 3. GET /api/v1/auth/jwks
 * DRV-08 / ADR-08: Publicar la clave pública de firma RS256 para validación local en Gateway y Ventas
 */
app.get('/api/v1/auth/jwks', (req, res) => {
  res.status(200).json(getJwks());
});

/**
 * 4. GET /api/v1/usuarios (y alias GET /usuarios)
 * RF-04: Consultar usuarios (ej. ?estado=inactivo) - Rol requerido: Administrador / ADMIN
 * No devuelve contraseñas, hashes ni información sensible.
 */
async function handleGetUsuarios(req, res) {
  try {
    const estadoParam = req.query.estado
      ? String(req.query.estado).trim().toLowerCase()
      : undefined;

    if (estadoParam && !['inactivo', 'activo'].includes(estadoParam)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: "El parámetro 'estado' debe ser 'inactivo' o 'activo'.",
        traceId: req.traceId,
      });
    }

    const usuarios = await usuarioRepository.findAll({ estado: estadoParam });
    return res.status(200).json(
      usuarios.map((u) => ({
        id: u._id,
        username: u.username,
        email: u.email || `${u.username}@uch.edu.ar`,
        nombreCliente: u.nombreCliente,
        rol: u.rol,
        estado: u.estado,
        createdAt: u.createdAt,
      })),
    );
  } catch (err) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      traceId: req.traceId,
    });
  }
}

app.get('/api/v1/usuarios', requireAuth('administrador'), handleGetUsuarios);
app.get('/usuarios', requireAuth('administrador'), handleGetUsuarios);

/**
 * 5. PATCH /api/v1/usuarios/:id/activacion (y alias PATCH /usuarios/:id/activacion)
 * RF-04: Activar usuario (cambiar estado de INACTIVO a ACTIVO) - Rol requerido: Administrador / ADMIN
 */
async function handleActivarUsuario(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'El identificador de usuario proporcionado no tiene un formato válido.',
        traceId: req.traceId,
      });
    }

    const estadoSolicitado = req.body?.estado
      ? String(req.body.estado).trim().toLowerCase()
      : 'activo';

    if (!['activo', 'inactivo'].includes(estadoSolicitado)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: "El estado debe ser 'activo' o 'inactivo'.",
        traceId: req.traceId,
      });
    }

    const usuarioExistente = await usuarioRepository.findById(id);
    if (!usuarioExistente) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'El usuario solicitado no existe en MongoDB.',
        traceId: req.traceId,
      });
    }

    const actualizado = await usuarioRepository.updateEstado(id, estadoSolicitado);

    return res.status(200).json({
      id: actualizado._id,
      username: actualizado.username,
      email: actualizado.email || `${actualizado.username}@uch.edu.ar`,
      nombreCliente: actualizado.nombreCliente,
      rol: actualizado.rol,
      estado: actualizado.estado,
      mensaje: `Usuario '${actualizado.username}' actualizado a estado '${actualizado.estado}' exitosamente.`,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      traceId: req.traceId,
    });
  }
}

app.patch('/api/v1/usuarios/:id/activacion', requireAuth('administrador'), handleActivarUsuario);
app.patch('/usuarios/:id/activacion', requireAuth('administrador'), handleActivarUsuario);

/**
 * Inicialización opcional de datos de desarrollo desde variables de entorno (sin credenciales fijas en código)
 * Para crear el primer administrador manualmente usar: npm run init-admin
 */
async function seedUsuariosDesdeEntorno() {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@uch.edu.ar';
  const adminNombre = process.env.ADMIN_NOMBRE || 'Administrador UCH-FyD';

  if (adminUser && adminPass) {
    const adminExists = await usuarioRepository.findByUsername(adminUser);
    if (!adminExists) {
      const hash = await bcrypt.hash(adminPass, 10);
      await usuarioRepository.create({
        username: adminUser.trim().toLowerCase(),
        email: adminEmail.trim().toLowerCase(),
        nombreCliente: adminNombre,
        passwordHash: hash,
        rol: 'administrador',
        estado: 'activo',
      });
      console.log(`[identity-service] Administrador inicial '${adminUser}' configurado desde variables de entorno.`);
    }
  }
}

async function bootstrap() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`[identity-service] Conectado a MongoDB en ${MONGO_URI}`);
    await seedUsuariosDesdeEntorno();
    app.listen(PORT, () => {
      console.log(`[identity-service] Escuchando en puerto ${PORT}`);
    });
  } catch (err) {
    console.error('[identity-service] Error al iniciar:', err);
    process.exit(1);
  }
}

bootstrap();
