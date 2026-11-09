const mongoose = require('mongoose');

/**
 * Modelo de Usuario en MongoDB (RI-04, SUP-02, SUP-06, RF-01 a RF-04)
 */
const usuarioSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    nombreCliente: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    rol: {
      type: String,
      enum: ['cliente', 'administrador'],
      default: 'cliente',
    },
    estado: {
      type: String,
      enum: ['inactivo', 'activo'],
      default: 'inactivo', // RF-02: Creación de usuario inicialmente inactivo
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Usuario', usuarioSchema);
