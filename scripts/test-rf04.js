/**
 * Script de pruebas funcionales para RF-04: Activación de usuarios por un administrador
 * Verifica los 8 escenarios a través del API Gateway (/api/v1):
 *   1. Un usuario nuevo se registra y queda INACTIVO (RF-01, RF-02).
 *   2. Ese usuario no puede iniciar sesión mientras esté inactivo (403 Forbidden).
 *   3. Un administrador inicia sesión correctamente y obtiene su JWT RS256.
 *   4. El administrador visualiza los usuarios pendientes (GET /api/v1/usuarios?estado=inactivo), sin contraseñas ni hashes.
 *   5. El administrador activa la cuenta (PATCH /api/v1/usuarios/:id/activacion).
 *   6. El usuario activado puede iniciar sesión y obtener su JWT.
 *   7. Un usuario normal (rol cliente) no puede acceder a los endpoints administrativos (403 Forbidden).
 *   8. Una solicitud sin token válido recibe 401 Unauthorized.
 *
 * Requisitos:
 *   - Servicios levantados (API Gateway en GATEWAY_URL, default http://localhost:8080)
 *   - Administrador inicial creado mediante `npm run init-admin` y credenciales pasadas por variables de entorno:
 *     ADMIN_USERNAME y ADMIN_PASSWORD.
 */
const assert = require('assert');
const crypto = require('crypto');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function api(path, options = {}) {
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

async function runTestsRF04() {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error(
      'ERROR: Definí las variables de entorno ADMIN_USERNAME y ADMIN_PASSWORD antes de ejecutar las pruebas.',
    );
    process.exit(1);
  }

  console.log('===================================================================');
  console.log(' EJECUCIÓN DE PRUEBAS FUNCIONALES RF-04 (VÍA API GATEWAY)');
  console.log('===================================================================\n');

  const suffix = Date.now().toString().slice(-6);
  const testUsername = `usuario_rf04_${suffix}`;
  const testEmail = `${testUsername}@uch.edu.ar`;
  const testPassword = `Clave_${suffix}_Segura!`;

  // Escenario 8: Solicitud sin token válido recibe 401
  console.log('Escenario 8: Solicitud sin token válido a GET /api/v1/usuarios?estado=inactivo...');
  const sinToken = await api('/api/v1/usuarios?estado=inactivo');
  assert.strictEqual(sinToken.res.status, 401, 'Debe devolver 401 Unauthorized sin token');
  console.log(`   [OK] Status recibido: ${sinToken.res.status} Unauthorized\n`);

  // Escenario 1: Un usuario nuevo se registra y queda INACTIVO (además intenta inyectar rol ADMIN en registro público)
  console.log(`Escenario 1: Registro público de '${testUsername}' (intentando forzar rol ADMIN)...`);
  const reg = await api('/api/v1/auth/registro', {
    method: 'POST',
    body: JSON.stringify({
      username: testUsername,
      email: testEmail,
      nombreCliente: 'Usuario Prueba RF04',
      password: testPassword,
      rol: 'ADMIN', // Debe ser ignorado por el backend y asignarse 'cliente'
    }),
  });
  assert.strictEqual(reg.res.status, 201, 'El registro debe devolver 201 Created');
  assert.strictEqual(reg.data.estado, 'inactivo', 'El usuario nuevo debe quedar en estado inactivo');
  assert.strictEqual(reg.data.rol, 'cliente', 'El registro público no debe permitir asignarse rol ADMIN');
  const nuevoUserId = reg.data.id;
  console.log(`   [OK] Usuario creado con id=${nuevoUserId}, estado='${reg.data.estado}', rol='${reg.data.rol}'\n`);

  // Escenario 2: Ese usuario no puede iniciar sesión mientras esté inactivo
  console.log('Escenario 2: Intento de inicio de sesión estando INACTIVO...');
  const loginInactivo = await api('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: testUsername,
      password: testPassword,
    }),
  });
  assert.strictEqual(loginInactivo.res.status, 403, 'El login de usuario inactivo debe devolver 403 Forbidden');
  console.log(`   [OK] Login rechazado con status ${loginInactivo.res.status}: ${loginInactivo.data.message}\n`);

  // Escenario 3: Un administrador inicia sesión correctamente
  console.log(`Escenario 3: Inicio de sesión del administrador '${ADMIN_USERNAME}'...`);
  const loginAdmin = await api('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    }),
  });
  assert.strictEqual(loginAdmin.res.status, 200, 'El administrador debe poder iniciar sesión (200 OK)');
  assert.ok(loginAdmin.data.accessToken, 'Debe recibir un JWT accessToken');
  const adminToken = loginAdmin.data.accessToken;
  console.log('   [OK] Administrador autenticado y JWT RS256 emitido.\n');

  // Escenario 4: El administrador visualiza los usuarios pendientes (sin hashes ni contraseñas)
  console.log('Escenario 4: Consulta de usuarios pendientes GET /api/v1/usuarios?estado=inactivo...');
  const pendientes = await api('/api/v1/usuarios?estado=inactivo', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(pendientes.res.status, 200, 'Debe devolver 200 OK al administrador');
  assert.ok(Array.isArray(pendientes.data), 'Debe devolver un arreglo de usuarios');
  const encontrado = pendientes.data.find((u) => u.id === nuevoUserId);
  assert.ok(encontrado, 'El usuario recién registrado debe figurar en la lista de inactivos');
  assert.strictEqual(encontrado.passwordHash, undefined, 'No debe exponer passwordHash');
  assert.strictEqual(encontrado.password, undefined, 'No debe exponer password');
  console.log(`   [OK] Usuario '${encontrado.username}' (${encontrado.email}) listado como '${encontrado.estado}' sin datos sensibles.\n`);

  // Escenario 5: El administrador activa la cuenta
  console.log(`Escenario 5: Activación de la cuenta mediante PATCH /api/v1/usuarios/${nuevoUserId}/activacion...`);
  const activacion = await api(`/api/v1/usuarios/${nuevoUserId}/activacion`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ estado: 'activo' }),
  });
  assert.strictEqual(activacion.res.status, 200, 'La activación debe devolver 200 OK');
  assert.strictEqual(activacion.data.estado, 'activo', 'El estado devuelto debe ser activo');
  console.log(`   [OK] Respuesta de confirmación: ${activacion.data.mensaje}\n`);

  // Escenario 6: El usuario activado puede iniciar sesión y obtener su JWT
  console.log('Escenario 6: Inicio de sesión del usuario recién activado...');
  const loginActivado = await api('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: testUsername,
      password: testPassword,
    }),
  });
  assert.strictEqual(loginActivado.res.status, 200, 'El usuario activado debe iniciar sesión con 200 OK');
  assert.ok(loginActivado.data.accessToken, 'El usuario activado debe recibir su JWT');
  const clienteToken = loginActivado.data.accessToken;
  console.log('   [OK] Usuario activado inició sesión y obtuvo su JWT.\n');

  // Escenario 7: Un usuario normal no puede acceder a los endpoints administrativos (403 Forbidden)
  console.log('Escenario 7: Usuario con rol cliente intenta acceder a GET y PATCH de administración de usuarios...');
  const clienteGet = await api('/api/v1/usuarios?estado=inactivo', {
    headers: { Authorization: `Bearer ${clienteToken}` },
  });
  assert.strictEqual(clienteGet.res.status, 403, 'GET /usuarios con rol cliente debe devolver 403 Forbidden');

  const clientePatch = await api(`/api/v1/usuarios/${nuevoUserId}/activacion`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${clienteToken}` },
    body: JSON.stringify({ estado: 'activo' }),
  });
  assert.strictEqual(clientePatch.res.status, 403, 'PATCH /usuarios/:id/activacion con rol cliente debe devolver 403 Forbidden');
  console.log(`   [OK] Ambos accesos administrativos por usuario cliente fueron rechazados con 403 Forbidden.\n`);

  console.log('===================================================================');
  console.log(' TODOS LOS 8 ESCENARIOS DE RF-04 PASARON EXITOSAMENTE');
  console.log('===================================================================');
}

runTestsRF04().catch((err) => {
  console.error('\n[FALLO EN PRUEBA RF-04]:', err.message);
  process.exit(1);
});
