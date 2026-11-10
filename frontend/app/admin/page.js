'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { formatARS } from '../../components/ProductVisuals';
import { useStore } from '../../context/StoreContext';

export default function AdminPage() {
  const router = useRouter();
  const {
    usuario,
    token,
    articulos,
    cargarCatalogo,
    apiRequest,
    showToast,
  } = useStore();

  const [usuarios, setUsuarios] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('inactivo');

  // Formulario de alta/edición de artículo
  const [codigo, setCodigo] = useState('A-1001');
  const [nombre, setNombre] = useState('Auriculares Bluetooth Pro');
  const [descripcion, setDescripcion] = useState(
    'Cancelación de ruido activa · Bluetooth 5.3 · Hasta 40 h de batería',
  );
  const [precioUnitario, setPrecioUnitario] = useState('210000');
  const [stock, setStock] = useState('5');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token && usuario?.rol === 'administrador') {
      cargarUsuarios(filtroEstado);
      cargarCatalogo();
    }
  }, [token, usuario, filtroEstado]);

  async function cargarUsuarios(estado) {
    try {
      const q = estado ? `?estado=${estado}` : '';
      const { res, data } = await apiRequest(`/api/v1/usuarios${q}`);
      if (res.ok && Array.isArray(data)) {
        setUsuarios(data);
      }
    } catch (_) {}
  }

  async function cambiarEstadoUsuario(id, nuevoEstado) {
    try {
      const { res, data } = await apiRequest(
        `/api/v1/usuarios/${id}/activacion`,
        {
          method: 'PATCH',
          body: JSON.stringify({ estado: nuevoEstado }),
        },
      );
      if (res.ok) {
        showToast(
          `[RF-04] Cuenta '${data.username}' actualizada a '${data.estado}'.`,
          'success',
        );
        cargarUsuarios(filtroEstado);
      } else {
        showToast(data.message || 'Error al actualizar estado', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function guardarArticulo(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { res, data } = await apiRequest(`/api/v1/articulos/${codigo}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre,
          descripcion,
          precioUnitario: Number(precioUnitario),
          stock: Number(stock),
        }),
      });
      if (res.ok) {
        showToast(
          `[RF-12] Artículo ${data.codigo} actualizado correctamente.`,
          'success',
        );
        await cargarCatalogo();
      } else {
        showToast(data.message || 'Error al guardar artículo', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function ajustarStockDirecto(cod, stockActual, delta) {
    const nuevoStock = Math.max(0, Number(stockActual) + delta);
    const { res, data } = await apiRequest(`/api/v1/articulos/${cod}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock: nuevoStock }),
    });
    if (res.ok) {
      showToast(
        `[PATCH /articulos/${cod}/stock] Stock actualizado a ${data.stock} u.`,
        'success',
      );
      cargarCatalogo();
    } else {
      showToast(data.message || 'Error al ajustar stock', 'error');
    }
  }

  if (!usuario || usuario.rol !== 'administrador') {
    return (
      <div>
        <Navbar />
        <main className="nexo-container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Acceso restringido a Administradores</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Iniciá sesión con una cuenta con rol de Administrador para gestionar usuarios y catálogo.
          </p>
          <button className="nexo-btn-primary" onClick={() => router.push('/login')}>
            Iniciar sesión como Admin
          </button>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <main className="nexo-container" style={{ padding: '2.25rem 1.5rem 4rem' }}>
        <div className="nexo-section-title">
          <div>
            <h1>Panel de Administración — NOVA Shop</h1>
            <p style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              Activación de usuarios (MongoDB) y administración de catálogo y stock (PostgreSQL)
            </p>
          </div>
        </div>

        {/* 1. Gestión de Activación de Usuarios (RF-04 - Servicio de Identidad) */}
        <section
          style={{
            background: 'var(--surface)',
            borderRadius: '1.25rem',
            border: '1px solid #ECEEF5',
            padding: '1.75rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 20px -10px rgba(31, 41, 55, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                1. Activación de Usuarios Registrados (RF-04 · MongoDB)
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Contrato: GET /api/v1/usuarios y PATCH /api/v1/usuarios/:id/activacion
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={
                  filtroEstado === 'inactivo'
                    ? 'nexo-btn-primary'
                    : 'nexo-btn-outline'
                }
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.84rem' }}
                onClick={() => setFiltroEstado('inactivo')}
              >
                Pendientes de Activación
              </button>
              <button
                className={
                  filtroEstado === '' ? 'nexo-btn-primary' : 'nexo-btn-outline'
                }
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.84rem' }}
                onClick={() => setFiltroEstado('')}
              >
                Todos los Usuarios
              </button>
            </div>
          </div>

          {usuarios.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No hay usuarios pendientes con el filtro seleccionado.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Usuario</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Nombre Completo</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Rol</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Estado</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700 }}>
                        {u.username}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>{u.nombreCliente}</td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>{u.rol}</td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background:
                              u.estado === 'activo' ? '#DCFCE7' : '#FEF3C7',
                            color:
                              u.estado === 'activo' ? '#166534' : '#92400E',
                          }}
                        >
                          {u.estado.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        {u.estado === 'inactivo' ? (
                          <button
                            className="nexo-btn-primary"
                            style={{
                              padding: '0.4rem 0.9rem',
                              fontSize: '0.82rem',
                              background: '#22C55E',
                            }}
                            onClick={() => cambiarEstadoUsuario(u.id, 'activo')}
                          >
                            ✓ Activar Cuenta
                          </button>
                        ) : (
                          u.username !== 'admin' && (
                            <button
                              className="nexo-btn-outline"
                              style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
                              onClick={() =>
                                cambiarEstadoUsuario(u.id, 'inactivo')
                              }
                            >
                              Desactivar
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 2. Gestión de Catálogo y Stock (RF-12 - Servidor de Ventas) */}
        <section
          style={{
            background: 'var(--surface)',
            borderRadius: '1.25rem',
            border: '1px solid #ECEEF5',
            padding: '1.75rem',
            boxShadow: '0 8px 20px -10px rgba(31, 41, 55, 0.05)',
          }}
        >
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            2. Administración del Catálogo de Artículos (RF-12 · PostgreSQL)
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Contratos: PUT /api/v1/articulos/:codigo y PATCH /api/v1/articulos/:codigo/stock
          </p>

          {/* Formulario de creación/modificación */}
          <form
            onSubmit={guardarArticulo}
            style={{
              background: '#F9FAFB',
              padding: '1.25rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              marginBottom: '1.75rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.85rem',
            }}
          >
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                Código
              </label>
              <input
                className="nexo-input"
                style={{ paddingLeft: '0.85rem', marginTop: '0.25rem' }}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                Nombre del Producto
              </label>
              <input
                className="nexo-input"
                style={{ paddingLeft: '0.85rem', marginTop: '0.25rem' }}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                Precio Unitario ($)
              </label>
              <input
                type="number"
                step="0.01"
                className="nexo-input"
                style={{ paddingLeft: '0.85rem', marginTop: '0.25rem' }}
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                Stock (Unidades enteras)
              </label>
              <input
                type="number"
                className="nexo-input"
                style={{ paddingLeft: '0.85rem', marginTop: '0.25rem' }}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                Descripción / Especificaciones
              </label>
              <input
                className="nexo-input"
                style={{ paddingLeft: '0.85rem', marginTop: '0.25rem' }}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="nexo-btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Guardando...' : 'Guardar Artículo en Catálogo'}
              </button>
            </div>
          </form>

          {/* Tabla rápida de control de stock */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Código</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Producto</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Precio Actual</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Stock Actual</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody>
                {articulos.map((art) => (
                  <tr key={art.codigo} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700 }}>
                      {art.codigo}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>{art.nombre}</td>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700 }}>
                      {formatARS(art.precioUnitario)}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: art.stock > 0 ? '#DCFCE7' : '#FEE2E2',
                          color: art.stock > 0 ? '#166534' : '#991B1B',
                        }}
                      >
                        {art.stock} u.
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <button
                          className="nexo-btn-outline"
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}
                          onClick={() =>
                            ajustarStockDirecto(art.codigo, art.stock, 5)
                          }
                        >
                          +5 Stock
                        </button>
                        <button
                          className="nexo-btn-outline"
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}
                          onClick={() => {
                            setCodigo(art.codigo);
                            setNombre(art.nombre);
                            setDescripcion(art.descripcion || '');
                            setPrecioUnitario(String(art.precioUnitario));
                            setStock(String(art.stock));
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                        >
                          Cargar en formulario
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
