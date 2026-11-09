'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Navbar from '../../components/Navbar';
import { useStore } from '../../context/StoreContext';

export default function LoginPage() {
  const router = useRouter();
  const { apiRequest, guardarSesion, showToast } = useStore();

  const [mode, setMode] = useState('login'); // 'login' | 'registro'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [email, setEmail] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const { res, data } = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: identifier,
          password,
        }),
      });

      if (!res.ok) {
        setErrorMsg(data.message || data.error || 'Error al iniciar sesión');
      } else {
        guardarSesion(data.accessToken, data.usuario);
        showToast(
          `¡Bienvenido/a ${data.usuario.nombreCliente}! Sesión SSO con JWT RS256 iniciada.`,
          'success',
        );
        if (
          data.usuario.rol === 'administrador' ||
          data.usuario.rol === 'ADMIN'
        ) {
          router.push('/admin/usuarios');
        } else {
          router.push('/');
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegistroSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const { res, data } = await apiRequest('/api/v1/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          username: identifier,
          email: email || identifier,
          nombreCliente: nombreCliente || identifier,
          password,
        }),
      });

      if (!res.ok) {
        setErrorMsg(data.message || data.error || 'Error al registrar usuario');
      } else {
        setInfoMsg(
          `[RF-01 / RF-02] Tu cuenta '${data.username}' fue creada en estado INACTIVO en MongoDB. Un Administrador debe activarla para que puedas ingresar.`,
        );
        setMode('login');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Navbar />

      <div className="nexo-auth-wrapper">
        <div className="nexo-auth-card">
          {/* Logo Centrado NEXO Store */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <Link
              href="/"
              className="nexo-logo"
              style={{ justifyContent: 'center', fontSize: '1.75rem' }}
            >
              NEXO <span>Store</span>
            </Link>
            <h1
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                marginTop: '1rem',
                color: 'var(--text)',
              }}
            >
              {mode === 'login' ? 'Iniciá sesión' : 'Creá tu cuenta'}
            </h1>
          </div>

          {errorMsg && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.84rem',
                marginBottom: '1rem',
              }}
            >
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1E40AF',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.84rem',
                marginBottom: '1rem',
              }}
            >
              {infoMsg}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit}>
              {/* Input Usuario / Email */}
              <div className="nexo-input-group">
                <svg
                  className="nexo-input-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  className="nexo-input"
                  placeholder="Email o nombre de usuario"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              {/* Input Contraseña con icono de ojo */}
              <div className="nexo-input-group">
                <svg
                  className="nexo-input-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="nexo-input"
                  placeholder="Contraseña"
                  style={{ paddingRight: '2.65rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  style={{
                    position: 'absolute',
                    right: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                  }}
                  title="Mostrar/ocultar contraseña"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '1.15rem' }}>
                <span
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() =>
                    setInfoMsg(
                      'Usá los botones rápidos de abajo para ingresar como Cliente, Administrador o probar una cuenta Inactiva.',
                    )
                  }
                >
                  ¿Olvidaste tu contraseña?
                </span>
              </div>

              <button
                type="submit"
                className="nexo-btn-primary"
                style={{ width: '100%', padding: '0.85rem' }}
                disabled={submitting}
              >
                {submitting ? 'Verificando credenciales...' : 'Ingresar'}
              </button>

              {/* Separador visual */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  margin: '1.35rem 0',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span>¿No tenés cuenta?</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <button
                type="button"
                className="nexo-btn-outline"
                style={{ width: '100%' }}
                onClick={() => {
                  setMode('registro');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
              >
                Registrate como nuevo usuario (RF-01 / RF-02)
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegistroSubmit}>
              <div className="nexo-input-group">
                <svg
                  className="nexo-input-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  className="nexo-input"
                  placeholder="Nombre de usuario único (SUP-06)"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              <div className="nexo-input-group">
                <svg
                  className="nexo-input-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  type="email"
                  className="nexo-input"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="nexo-input-group">
                <svg
                  className="nexo-input-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                <input
                  type="text"
                  className="nexo-input"
                  placeholder="Nombre y Apellido"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  required
                />
              </div>

              <div className="nexo-input-group">
                <svg
                  className="nexo-input-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="password"
                  className="nexo-input"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="nexo-btn-primary"
                style={{ width: '100%', padding: '0.85rem', marginBottom: '1rem' }}
                disabled={submitting}
              >
                {submitting
                  ? 'Creando cuenta...'
                  : 'Registrarme (Estado Inactivo - RF-02)'}
              </button>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.88rem',
                  color: 'var(--text-muted)',
                }}
              >
                ¿Ya tenés cuenta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Iniciá sesión
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
