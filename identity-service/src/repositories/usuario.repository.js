const Usuario = require('../models/usuario.model');

/**
 * Patrón Repository para encapsular el acceso a MongoDB (ADR-06, DRV-03)
 */
class UsuarioRepository {
  async findByUsernameOrEmail(identifier) {
    const clean = identifier.trim().toLowerCase();
    return Usuario.findOne({
      $or: [{ username: clean }, { email: clean }],
    });
  }

  async findByUsername(username) {
    return Usuario.findOne({ username: username.trim().toLowerCase() });
  }

  async findById(id) {
    return Usuario.findById(id);
  }

  async findAll(filtro = {}) {
    const query = {};
    if (filtro.estado) {
      query.estado = filtro.estado;
    }
    return Usuario.find(query).select('-passwordHash').sort({ createdAt: -1 });
  }

  async create(datosUsuario) {
    const nuevo = new Usuario(datosUsuario);
    return nuevo.save();
  }

  async updateEstado(id, estado) {
    return Usuario.findByIdAndUpdate(
      id,
      { estado },
      { new: true }
    ).select('-passwordHash');
  }
}

module.exports = new UsuarioRepository();
