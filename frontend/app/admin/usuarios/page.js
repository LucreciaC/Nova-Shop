'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '../../../components/Navbar';
import { useStore } from '../../../context/StoreContext';

function isAdminUser(usuario) {
  if (!usuario?.rol) return false;
  const r = String(usuario.rol).trim().toLowerCase();
  return r === 'administrador' || r === 'admin';
}

export default function AdminUsuariosPage() {
  const router = useRouter();
  const { usuario, token, apiRequest, showToast } = useStore();

  const [usuariosPendientes, setUsuariosPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [activandoId, setActivandoId] = useState(null);
  const [usuarioAConfirmar, setUsuarioAConfirmar] = useState(null);
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    if (token && isAdminUser(usuario)) {
      cargarUsuariosPendientes();
    } else {
      setCargando(false);
    }
  }, [token, usuario]);

  async function cargarUsuariosPendientes() {
    setCargando(true);
    setMensajeError('');
    try {
      const { res, data } = await apiRequest(
        '/api/v1/usuarios?estado=inactivo',
      );
      if (!res.ok) {
        setMensajeError(
          data.message ||
            data.error ||
            `Error HTTP ${res.status} al consultar usuarios pendientes.`,
        );
      } else if (Array.isArray(data)) {
        setUsuariosPendientes(data);
      }
    } catch (err) {
      setMensajeError(
        `No se pudo conectar con el API Gateway: ${err.message}`,
      );
    } finally {
      setCargando(false);
    }
  }

  async function confirmarActivacion() {
    if (!usuarioAConfirmar) return;
    const targetUser = usuarioAConfirmar;
    setUsuarioAConfirmar(null);
    setActivandoId(targetUser.id);
    setMensajeExito('');
    setMensajeError('');

    try {
      const { res, data } = await apiRequest(
        `/api/v1/usuarios/${targetUser.id}/activacion`,
        {
          method: 'PATCH',
          body: JSON.stringify({ estado: 'activo' }),
        },
      );

      if (!res.ok) {
        const msg =
          data.message ||
          data.error ||
          `No se pudo activar la cuenta (HTTP ${res.status}).`;
        setMensajeError(msg);
        showToast(msg, 'error');
      } else {
        const msg =
          data.mensaje ||
          `La cuenta de '${data.username}' fue activada exitosamente.`;
        setMensajeExito(msg);
        showToast(msg, 'success');
        await cargarUsuariosPendientes();
      }
    } catch (err) {
      setMensajeError(`Error de red al activar usuario: ${err.message}`);
    } finally {
      setActivandoId(null);
    }
  }

  if (!usuario) {
    return (
      <div>
        <Navbar />
        <main
          className="nexo-container"
          style={{ padding: '4rem 1.5rem', textAlign: 'center' }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '1.5rem',
              border: '1px solid var(--border)',
              maxWidth: 520,
              margin: '0 auto',
              padding: '2.5rem 2rem',
            }}
          >
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Administración de usuarios
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Debés iniciar sesión con una cuenta de rol Administrador para acceder a este panel (401 Unauthorized).
            </p>
            <button
              className="nexo-btn-primary"
              onClick={() => router.push('/login')}
            >
              Iniciar sesión
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!isAdminUser(usuario)) {
    return (
      <div>
        <Navbar />
        <main
          className="nexo-container"
          style={{ padding: '4rem 1.5rem', textAlign: 'center' }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '1.5rem',
              border: '1px solid #FECACA',
              maxWidth: 520,
              margin: '0 auto',
              padding: '2.5rem 2rem',
            }}
          >
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#991B1B',
                marginBottom: '0.75rem',
              }}
            >
              Acceso denegado (403 Forbidden)
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Tu cuenta (<strong>{usuario.username}</strong>) tiene rol{' '}
              <strong>{usuario.rol}</strong>. Esta sección requiere permisos de
              Administrador (RF-04).
            </p>
            <button
              className="nexo-btn-outline"
              onClick={() => router.push('/')}
            >
              Volver al inicio
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <main className="nexo-container" style={{ padding: '2.25rem 1.5rem 4rem' }}>
        {/* Encabezado de página */}
        <div className="nexo-section-title">
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              Administración de usuarios
            </h1>
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 400,
                color: 'var(--text-muted)',
                marginTop: '0.25rem',
              }}
            >
              RF-04: Gestión de activación de cuentas registradas en estado
              inactivo · Vía API Gateway (<code>/api/v1/usuarios?estado=inactivo</code>)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <Link href="/admin" className="nexo-btn-outline">
              Ir a Catálogo y Stock
            </Link>
            <button
              className="nexo-btn-primary"
              onClick={cargarUsuariosPendientes}
              disabled={cargando}
            >
              {cargando ? 'Actualizando...' : 'Actualizar listado'}
            </button>
          </div>
        </div>

        {/* Mensajes claros de éxito y error */}
        {mensajeExito && (
          <div
            style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              color: '#166534',
              padding: '0.95rem 1.25rem',
              borderRadius: '0.9rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: '0.92rem',
            }}
          >
            <span>✓ {mensajeExito}</span>
            <button
              onClick={() => setMensajeExito('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {mensajeError && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              padding: '0.95rem 1.25rem',
              borderRadius: '0.9rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: '0.92rem',
            }}
          >
            <span>⚠ {mensajeError}</span>
            <button
              onClick={() => setMensajeError('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Tarjeta del listado */}
        <section
          style={{
            background: 'var(--surface)',
            borderRadius: '1.25rem',
            border: '1px solid #ECEEF5',
            padding: '1.75rem',
            boxShadow: '0 8px 20px -10px rgba(31, 41, 55, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Usuarios pendientes de activación ({usuariosPendientes.length})
            </h2>
          </div>

          {cargando ? (
            <div
              style={{
                padding: '3rem 1rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              Cargando usuarios pendientes desde el Servicio de Identidad...
            </div>
          ) : usuariosPendientes.length === 0 ? (
            <div
              style={{
                padding: '3rem 1rem',
                textAlign: 'center',
                background: '#F9FAFB',
                borderRadius: '1rem',
                border: '1px dashed var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  marginBottom: '0.35rem',
                }}
              >
                No hay usuarios pendientes de activación
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Todas las cuentas registradas se encuentran activas actualmente.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.92rem',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border)',
                      textAlign: 'left',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <th style={{ padding: '0.8rem 0.6rem' }}>
                      Nombre de usuario
                    </th>
                    <th style={{ padding: '0.8rem 0.6rem' }}>
                      Correo electrónico
                    </th>
                    <th style={{ padding: '0.8rem 0.6rem' }}>Nombre</th>
                    <th style={{ padding: '0.8rem 0.6rem' }}>
                      Estado de la cuenta
                    </th>
                    <th style={{ padding: '0.8rem 0.6rem', textAlign: 'right' }}>
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosPendientes.map((u) => (
                    <tr
                      key={u.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td
                        style={{
                          padding: '0.95rem 0.6rem',
                          fontWeight: 700,
                          color: 'var(--text)',
                        }}
                      >
                        {u.username}
                      </td>
                      <td
                        style={{
                          padding: '0.95rem 0.6rem',
                          color: '#4B5563',
                        }}
                      >
                        {u.email || `${u.username}@uch.edu.ar`}
                      </td>
                      <td style={{ padding: '0.95rem 0.6rem' }}>
                        {u.nombreCliente}
                      </td>
                      <td style={{ padding: '0.95rem 0.6rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.7rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: '#FEF3C7',
                            color: '#92400E',
                          }}
                        >
                          {String(u.estado).toUpperCase()}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '0.95rem 0.6rem',
                          textAlign: 'right',
                        }}
                      >
                        <button
                          className="nexo-btn-primary"
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem',
                            background: '#22C55E',
                          }}
                          disabled={activandoId === u.id}
                          onClick={() => setUsuarioAConfirmar(u)}
                        >
                          {activandoId === u.id
                            ? 'Activando...'
                            : 'Activar usuario'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Modal de Confirmación antes de activar una cuenta */}
      {usuarioAConfirmar && (
        <div
          className="nexo-modal-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setUsuarioAConfirmar(null);
          }}
        >
          <div className="nexo-modal-card" style={{ maxWidth: 440 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '9999px',
                background: '#EDE9FE',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontWeight: 800,
                fontSize: '1.35rem',
              }}
            >
              ?
            </div>

            <h3
              style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                marginBottom: '0.5rem',
              }}
            >
              Confirmar activación de cuenta
            </h3>

            <p
              style={{
                fontSize: '0.92rem',
                color: 'var(--text-muted)',
                marginBottom: '1.5rem',
              }}
            >
              ¿Estás seguro de que deseás activar la cuenta del usuario{' '}
              <strong>{usuarioAConfirmar.username}</strong> (
              {usuarioAConfirmar.email || `${usuarioAConfirmar.username}@uch.edu.ar`})?
              Una vez activada, podrá iniciar sesión y realizar pedidos en el sistema.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="nexo-btn-outline"
                style={{ flex: 1 }}
                onClick={() => setUsuarioAConfirmar(null)}
              >
                Cancelar
              </button>
              <button
                className="nexo-btn-primary"
                style={{ flex: 1, background: '#22C55E' }}
                onClick={confirmarActivacion}
              >
                Sí, activar usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
