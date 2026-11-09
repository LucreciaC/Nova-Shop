/**
 * Script de inicialización manual del primer usuario Administrador (RF-04 / Seguridad)
 * Lee las credenciales exclusivamente desde variables de entorno:
 *   - MONGO_URI (default: mongodb://localhost:27017/novashop_identidad)
 *   - ADMIN_USERNAME
 *   - ADMIN_EMAIL
 *   - ADMIN_NOMBRE
 *   - ADMIN_PASSWORD
 *
 * Uso manual:
 *   ADMIN_USERNAME=admin ADMIN_EMAIL=admin@uch.edu.ar ADMIN_PASSWORD=<clave_segura> npm run init-admin
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const usuarioRepository = require('../repositories/usuario.repository');

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/novashop_identidad';

async function initAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nombreCliente = process.env.ADMIN_NOMBRE || 'Administrador UCH-FyD';

  if (!username || !password) {
    console.error(
      '[init-admin] ERROR: Debe definir las variables de entorno ADMIN_USERNAME y ADMIN_PASSWORD antes de ejecutar este script.',
    );
    console.error(
      'Ejemplo (PowerShell): $env:ADMIN_USERNAME="admin"; $env:ADMIN_EMAIL="admin@uch.edu.ar"; $env:ADMIN_PASSWORD="TuPasswordSegura"; npm run init-admin',
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log(`[init-admin] Conectado a MongoDB (${MONGO_URI})`);

    const passwordHash = await bcrypt.hash(password, 10);
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email ? email.trim().toLowerCase() : `${cleanUsername}@uch.edu.ar`;

    const existente = await usuarioRepository.findByUsernameOrEmail(cleanUsername);
    if (existente) {
      existente.rol = 'administrador';
      existente.estado = 'activo';
      existente.email = cleanEmail;
      existente.nombreCliente = nombreCliente;
      existente.passwordHash = passwordHash;
      await existente.save();
      console.log(
        `[init-admin] Usuario existente '${existente.username}' actualizado con rol 'administrador' y estado 'activo'.`,
      );
    } else {
      const nuevoAdmin = await usuarioRepository.create({
        username: cleanUsername,
        email: cleanEmail,
        nombreCliente,
        passwordHash,
        rol: 'administrador',
        estado: 'activo',
      });
      console.log(
        `[init-admin] Primer administrador '${nuevoAdmin.username}' (id: ${nuevoAdmin._id}) creado exitosamente en estado 'activo'.`,
      );
    }
  } catch (err) {
    console.error('[init-admin] Error al inicializar administrador:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

initAdmin();
