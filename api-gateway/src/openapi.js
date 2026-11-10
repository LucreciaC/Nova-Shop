const openapiSpecification = {
  openapi: '3.0.3',
  info: {
    title: 'NOVA Shop (UCH-FyD) — Contrato SOA Unificado',
    version: '1.0.0',
    description:
      'Contrato estandarizado OpenAPI 3 de los servicios de Identidad, Catálogo y Pedidos expuestos a través del API Gateway bajo el prefijo /api/v1 (TP3-1 Sección 2 y 3).',
  },
  servers: [
    {
      url: 'http://localhost:8080/api/v1',
      description: 'API Gateway SOA (HTTP)',
    },
    {
      url: 'https://localhost:8443/api/v1',
      description: 'API Gateway SOA (HTTPS / TLS - RNF-06)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT (RS256 - 15m)',
      },
    },
    parameters: {
      TraceIdHeader: {
        name: 'X-Trace-ID',
        in: 'header',
        required: false,
        schema: { type: 'string', format: 'uuid' },
        description: 'Identificador único de trazabilidad distribuida (TP3-1 Sección 4).',
      },
      IdempotencyKeyHeader: {
        name: 'Idempotency-Key',
        in: 'header',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'Clave única de idempotencia para evitar confirmación duplicada de pedidos (ADR-09).',
      },
    },
  },
  paths: {
    '/auth/registro': {
      post: {
        tags: ['Identidad'],
        summary: 'Registrar usuario, inicialmente inactivo (RF-01, RF-02)',
        parameters: [{ $ref: '#/components/parameters/TraceIdHeader' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'lucrecia' },
                  email: { type: 'string', example: 'lucrecia@uch.edu.ar' },
                  nombreCliente: { type: 'string', example: 'Lucrecia Concatti' },
                  password: { type: 'string', example: 'ClaveSegura123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Usuario creado en estado inactivo.' },
          400: { description: 'Datos faltantes o inválidos.' },
          409: { description: 'El nombre de usuario ya existe (SUP-06).' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Identidad'],
        summary: 'Iniciar sesión y obtener un JWT firmado mediante RS256 (RF-03, ADR-08)',
        parameters: [{ $ref: '#/components/parameters/TraceIdHeader' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'cliente-demo' },
                  password: { type: 'string', example: 'cliente123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Autenticación exitosa, devuelve JWT RS256 con expiración de 15 minutos.' },
          401: { description: 'Credenciales inválidas.' },
          403: { description: 'La cuenta se encuentra inactiva (RF-02 / RF-04).' },
          429: { description: 'Límite de intentos por usuario/IP superado.' },
        },
      },
    },
    '/auth/jwks': {
      get: {
        tags: ['Identidad'],
        summary: 'Publicar la clave pública de firma RS256 (DRV-08, ADR-08)',
        responses: {
          200: { description: 'Conjunto de claves públicas JWK para validación local en Gateway y Ventas.' },
        },
      },
    },
    '/usuarios': {
      get: {
        tags: ['Identidad'],
        summary: 'Consultar usuarios pendientes de activación (RF-04)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'estado',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['inactivo', 'activo'], default: 'inactivo' },
          },
          { $ref: '#/components/parameters/TraceIdHeader' },
        ],
        responses: {
          200: { description: 'Listado de usuarios (sin contraseñas ni hashes).' },
          401: { description: 'Token ausente, vencido o con firma inválida.' },
          403: { description: 'El usuario no posee el rol Administrador.' },
        },
      },
    },
    '/usuarios/{id}/activacion': {
      patch: {
        tags: ['Identidad'],
        summary: 'Activar usuario (RF-04)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { $ref: '#/components/parameters/TraceIdHeader' },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  estado: { type: 'string', enum: ['activo', 'inactivo'], default: 'activo' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Usuario activado en MongoDB.' },
          401: { description: 'Token ausente o inválido.' },
          403: { description: 'Se requiere rol Administrador.' },
          404: { description: 'Usuario no encontrado.' },
        },
      },
    },
    '/articulos': {
      get: {
        tags: ['Catálogo'],
        summary: 'Consultar catálogo de artículos (RF-05, RF-06)',
        parameters: [{ $ref: '#/components/parameters/TraceIdHeader' }],
        responses: {
          200: {
            description: 'Lista de artículos con código, nombre, stock disponible y precio unitario.',
          },
        },
      },
    },
    '/articulos/{codigo}': {
      get: {
        tags: ['Catálogo'],
        summary: 'Consultar un artículo por código (RF-06)',
        parameters: [
          { name: 'codigo', in: 'path', required: true, schema: { type: 'string', example: 'A-1001' } },
        ],
        responses: {
          200: { description: 'Detalle del artículo.' },
          404: { description: 'El código de artículo no existe.' },
        },
      },
      put: {
        tags: ['Catálogo'],
        summary: 'Crear o modificar un artículo y su precio (RF-12)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'codigo', in: 'path', required: true, schema: { type: 'string', example: 'A-1001' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'precioUnitario'],
                properties: {
                  nombre: { type: 'string', example: 'Auriculares Bluetooth Pro' },
                  precioUnitario: { type: 'number', example: 210000.0 },
                  stock: { type: 'integer', example: 5 },
                  descripcion: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Artículo creado o modificado.' },
          401: { description: 'Token ausente o inválido.' },
          403: { description: 'Se requiere rol Administrador.' },
        },
      },
    },
    '/articulos/{codigo}/stock': {
      patch: {
        tags: ['Catálogo'],
        summary: 'Ajustar stock de un artículo (RF-12, SUP-03)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'codigo', in: 'path', required: true, schema: { type: 'string', example: 'A-1001' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  stock: { type: 'integer', example: 5 },
                  ajuste: { type: 'integer', example: 2 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Stock actualizado.' },
          400: { description: 'Stock negativo o no entero.' },
          403: { description: 'Se requiere rol Administrador.' },
          404: { description: 'Artículo no encontrado.' },
        },
      },
    },
    '/pedidos': {
      post: {
        tags: ['Pedidos'],
        summary: 'Confirmar un pedido (RF-07 a RF-11, ADR-02, ADR-08, ADR-09)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/IdempotencyKeyHeader' },
          { $ref: '#/components/parameters/TraceIdHeader' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lineas'],
                properties: {
                  lineas: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['codigoArticulo', 'cantidad'],
                      properties: {
                        codigoArticulo: { type: 'string', example: 'A-1001' },
                        cantidad: { type: 'integer', example: 4 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Pedido confirmado y stock descontado en transacción SQL.' },
          200: { description: 'Resultado previamente registrado devuelto por Idempotency-Key.' },
          400: { description: 'Cantidad inválida, cero o negativa.' },
          401: { description: 'Token ausente, vencido o con firma inválida.' },
          403: { description: 'El usuario no tiene el rol requerido o cuenta inactiva.' },
          404: { description: 'El código de artículo no existe.' },
          409: { description: 'Stock insuficiente; la operación se revierte sin pedido parcial.' },
        },
      },
      get: {
        tags: ['Pedidos'],
        summary: 'Listar pedidos propios (RF-07)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de pedidos del cliente autenticado.' },
          401: { description: 'No autenticado.' },
        },
      },
    },
    '/pedidos/{numero}': {
      get: {
        tags: ['Pedidos'],
        summary: 'Consultar un pedido propio por número (RF-08)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'numero', in: 'path', required: true, schema: { type: 'integer', example: 15432 } },
        ],
        responses: {
          200: { description: 'Detalle del pedido y sus líneas.' },
          403: { description: 'El pedido pertenece a otro usuario.' },
          404: { description: 'Pedido no encontrado.' },
        },
      },
    },
  },
};

module.exports = openapiSpecification;
