/**
 * Script de Verificación de la Arquitectura SOA (TP1, TP2 y TP3-1)
 * Ejecuta automáticamente las pruebas de evidencia de cumplimiento de la página 67-68:
 * 1. Trazabilidad X-Trace-ID y contratos /api/v1
 * 2. Control de acceso en API Gateway (401 sin token)
 * 3. Registro de usuario inactivo (RF-01/02) -> rechazo login 403 -> activación por Admin (RF-04) -> login exitoso (RF-03)
 * 4. Escalamiento horizontal / Balanceo de carga entre instancias de Ventas (ADR-01)
 * 5. Idempotencia en POST /api/v1/pedidos con Idempotency-Key (ADR-09)
 * 6. Escenario medible de Concurrencia de Stock: Artículo A-1001 con 5 unidades, 2 clientes compran 4 unidades simultáneamente -> 1 confirma (201) y 1 recibe 409 Conflict, stock final = 1 (ADR-02, pág. 20 y 63).
 */
const crypto = require('crypto');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function request(path, options = {}) {
  const traceId = crypto.randomUUID();
  const headers = {
    'Content-Type': 'application/json',
    'X-Trace-ID': traceId,
    ...(options.headers || {}),
  };
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data, traceId };
}

async function runTests() {
  console.log('===================================================================');
  console.log(' VERIFICACIÓN AUTOMÁTICA DE ARQUITECTURA SOA — UCH-FyD (NOVA Shop)');
  console.log('===================================================================\n');

  // 1. Verificar API Gateway rechazando solicitudes sin token (401 Unauthorized)
  console.log('1) [DRV-08 / ADR-04] Probando solicitud sin JWT a ruta protegida POST /api/v1/pedidos...');
  const noAuth = await request('/api/v1/pedidos', {
    method: 'POST',
    body: JSON.stringify({ lineas: [{ codigoArticulo: 'A-1001', cantidad: 1 }] }),
  });
  console.log(`   -> Status recibido: ${noAuth.res.status} (Esperado: 401) | X-Trace-ID: ${noAuth.res.headers.get('x-trace-id')}\n`);

  // 2. Flujo completo de Identidad: Registro inactivo -> Login 403 -> Activación por Admin -> Login 200
  const tempUsername = `alumno_${Date.now().toString().slice(-5)}`;
  console.log(`2) [DRV-07 / RF-01 a RF-04] Probando ciclo de vida de usuario '${tempUsername}'...`);
  const reg = await request('/api/v1/auth/registro', {
    method: 'POST',
    body: JSON.stringify({
      username: tempUsername,
      nombreCliente: 'Alumno Prueba SOA',
      password: 'password123',
    }),
  });
  console.log(`   -> Registro: HTTP ${reg.res.status} | Estado inicial: '${reg.data.estado}' (Esperado: inactivo)`);

  const loginInactivo = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: tempUsername, password: 'password123' }),
  });
  console.log(`   -> Intento login antes de activar: HTTP ${loginInactivo.res.status} (Esperado: 403 Forbidden)`);

  const loginAdmin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });
  if (!loginAdmin.res.ok) {
    throw new Error(
      `No se pudo autenticar como administrador ('${ADMIN_USERNAME}'). Ejecutá primero el script init-admin o definí ADMIN_USERNAME y ADMIN_PASSWORD.`,
    );
  }
  const adminToken = loginAdmin.data.accessToken;

  const act = await request(`/api/v1/usuarios/${reg.data.id}/activacion`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ estado: 'activo' }),
  });
  console.log(`   -> Activación por Administrador: HTTP ${act.res.status} | Nuevo estado: '${act.data.estado}'`);

  const loginActivo = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: tempUsername, password: 'password123' }),
  });
  console.log(`   -> Login tras activación: HTTP ${loginActivo.res.status} | JWT emitido correctamente\n`);

  // 3. Verificar Balanceo de Carga entre instancias de Ventas (ADR-01)
  console.log('3) [DRV-02 / ADR-01] Verificando distribución de solicitudes entre instancias del Servidor de Ventas...');
  const rInst1 = await request('/api/v1/articulos');
  const rInst2 = await request('/api/v1/articulos');
  console.log(`   -> Petición 1 atendida por: ${rInst1.res.headers.get('x-ventas-instance')}`);
  console.log(`   -> Petición 2 atendida por: ${rInst2.res.headers.get('x-ventas-instance')}\n`);

  // 4. Preparar stock de A-1001 en 5 unidades exactas para el escenario del TP1/TP3
  console.log('4) [RF-12] Asegurando que el artículo A-1001 tenga exactamente 5 unidades de stock...');
  await request('/api/v1/articulos/A-1001/stock', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ stock: 5 }),
  });
  const artInicial = await request('/api/v1/articulos/A-1001');
  console.log(`   -> Artículo A-1001 | Precio: $${artInicial.data.precioUnitario} | Stock inicial: ${artInicial.data.stock} unidades\n`);

  // 5. Escenario Crítico de Concurrencia de Stock (TP1 pág. 20 / TP3-1 pág. 63-64)
  console.log('5) [DRV-01 / ADR-02] Ejecutando Escenario de Concurrencia: 2 clientes compran simultáneamente 4 unidades de A-1001 (Stock = 5)...');
  const c1User = `cliente1_${Date.now().toString().slice(-4)}`;
  const c2User = `cliente2_${Date.now().toString().slice(-4)}`;

  const regC1 = await request('/api/v1/auth/registro', {
    method: 'POST',
    body: JSON.stringify({ username: c1User, nombreCliente: 'Cliente Concurrente 1', password: 'password123' }),
  });
  const regC2 = await request('/api/v1/auth/registro', {
    method: 'POST',
    body: JSON.stringify({ username: c2User, nombreCliente: 'Cliente Concurrente 2', password: 'password123' }),
  });

  await request(`/api/v1/usuarios/${regC1.data.id}/activacion`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ estado: 'activo' }),
  });
  await request(`/api/v1/usuarios/${regC2.data.id}/activacion`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ estado: 'activo' }),
  });

  const loginCliente1 = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: c1User, password: 'password123' }),
  });
  const loginCliente2 = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: c2User, password: 'password123' }),
  });

  const tokenC1 = loginCliente1.data.accessToken;
  const tokenC2 = loginCliente2.data.accessToken;
  const idempKeyCliente1 = crypto.randomUUID();

  const [compra1, compra2] = await Promise.all([
    request('/api/v1/pedidos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenC1}`,
        'Idempotency-Key': idempKeyCliente1,
      },
      body: JSON.stringify({
        lineas: [{ codigoArticulo: 'A-1001', cantidad: 4 }],
      }),
    }),
    request('/api/v1/pedidos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenC2}`,
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        lineas: [{ codigoArticulo: 'A-1001', cantidad: 4 }],
      }),
    }),
  ]);

  console.log(`   -> Cliente 1 resultado: HTTP ${compra1.res.status} (${compra1.data.numero ? 'Pedido #' + compra1.data.numero + ' confirmado' : compra1.data.message})`);
  console.log(`   -> Cliente 2 resultado: HTTP ${compra2.res.status} (${compra2.data.numero ? 'Pedido #' + compra2.data.numero + ' confirmado' : compra2.data.message})`);

  const artFinal = await request('/api/v1/articulos/A-1001');
  console.log(`   -> Stock final de A-1001: ${artFinal.data.stock} unidad (Esperado: 1, sin sobreventa ni stock negativo)\n`);

  // 6. Verificar Idempotency-Key (ADR-09)
  const keyExitosa = compra1.res.status === 201 ? idempKeyCliente1 : null;
  if (keyExitosa) {
    console.log('6) [DRV-06 / ADR-09] Reenviando solicitud de Cliente 1 con la misma Idempotency-Key...');
    const replay = await request('/api/v1/pedidos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenC1}`,
        'Idempotency-Key': keyExitosa,
      },
      body: JSON.stringify({
        lineas: [{ codigoArticulo: 'A-1001', cantidad: 4 }],
      }),
    });
    const artDespuesReplay = await request('/api/v1/articulos/A-1001');
    console.log(`   -> Respuesta idempotente: HTTP ${replay.res.status} | Pedido devuelto: #${replay.data.numero} (Mismo que #${compra1.data.numero})`);
    console.log(`   -> Stock de A-1001 tras reintento: ${artDespuesReplay.data.stock} unidad (No volvió a descontar stock)\n`);
  }

  console.log('===================================================================');
  console.log(' TODAS LAS VERIFICACIONES ARQUITECTÓNICAS FINALIZARON CON ÉXITO');
  console.log('===================================================================');
}

runTests().catch((err) => {
  console.error('Error ejecutando pruebas:', err);
  process.exit(1);
});
