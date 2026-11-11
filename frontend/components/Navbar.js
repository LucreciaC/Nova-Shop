'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '../context/StoreContext';
import NovaAIAssistant from './NovaAIAssistant';
import { formatARS, ProductIllustration } from './ProductVisuals';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    usuario,
    cerrarSesion,
    carrito,
    cantidadTotalCarrito,
    subtotalCarrito,
    isCartOpen,
    setIsCartOpen,
    actualizarCantidadCarrito,
    eliminarDelCarrito,
    finalizarCompra,
    confirmedOrderModal,
    setConfirmedOrderModal,
    toast,
    setToast,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    lastTraceId,
    lastVentasInstance,
    lastCircuitState,
    currentIdempotencyKey,
    lastUsedIdempotencyKey,
    loading,
  } = useStore();

  function handleSearchChange(e) {
    setSearchQuery(e.target.value);
    if (pathname !== '/') {
      router.push('/');
    }
  }

  return (
    <>
      {/* Navbar Principal NOVA Shop */}
      <header className="nexo-navbar">
        <div className="nexo-container nexo-navbar-inner">
          {/* Logo */}
          <Link href="/" className="nexo-logo">
            NOVA <span>Shop</span>
          </Link>

          {/* Links de Navegación */}
          <nav className="nexo-nav-links">
            <Link
              href="/"
              className={`nexo-nav-link ${
                pathname === '/' && selectedCategory === 'Todas' ? 'active' : ''
              }`}
              onClick={() => setSelectedCategory('Todas')}
            >
              Inicio
            </Link>
            <a
              href="/#catalogo"
              className="nexo-nav-link"
              onClick={() => setSelectedCategory('Todas')}
            >
              Productos
            </a>
            <Link
              href="/categorias"
              className={`nexo-nav-link ${
                pathname === '/categorias' ? 'active' : ''
              }`}
            >
              Categorías
            </Link>
            <Link
              href="/ofertas"
              className={`nexo-nav-link ${
                pathname === '/ofertas' ? 'active' : ''
              }`}
            >
              Ofertas
            </Link>
            {usuario && (
              <Link
                href="/pedidos"
                className={`nexo-nav-link ${
                  pathname === '/pedidos' ? 'active' : ''
                }`}
              >
                Mis Pedidos
              </Link>
            )}
            {(usuario?.rol === 'administrador' || usuario?.rol === 'ADMIN') && (
              <>
                <Link
                  href="/admin/usuarios"
                  className={`nexo-nav-link ${
                    pathname === '/admin/usuarios' ? 'active' : ''
                  }`}
                  style={{ color: '#6C5CE7', fontWeight: 700 }}
                >
                  Admin Usuarios
                </Link>
                <Link
                  href="/admin"
                  className={`nexo-nav-link ${
                    pathname === '/admin' ? 'active' : ''
                  }`}
                >
                  Catálogo Admin
                </Link>
              </>
            )}
          </nav>

          {/* Buscador con autocompletado/filtrado en vivo */}
          <div className="nexo-search-box">
            <svg
              className="nexo-search-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="nexo-search-input"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          {/* Iconos: Favoritos, Carrito con Badge y Usuario */}
          <div className="nexo-actions">
            <button
              className="nexo-icon-btn"
              title="Productos destacados"
              onClick={() => router.push('/#catalogo')}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            <button
              className="nexo-icon-btn"
              title="Mi carrito"
              onClick={() => setIsCartOpen(true)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {cantidadTotalCarrito > 0 && (
                <span className="nexo-cart-badge">{cantidadTotalCarrito}</span>
              )}
            </button>

            {usuario ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link
                  href={
                    usuario.rol === 'administrador' || usuario.rol === 'ADMIN'
                      ? '/admin/usuarios'
                      : '/pedidos'
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '9999px',
                    background: '#F3F4F8',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#22C55E',
                    }}
                  />
                  {usuario.username}
                </Link>
                <button
                  className="nexo-icon-btn"
                  title="Cerrar sesión"
                  onClick={cerrarSesion}
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="nexo-icon-btn"
                title="Iniciar sesión"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Toast Flotante de Feedback */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 80,
            maxWidth: '420px',
            padding: '0.95rem 1.25rem',
            borderRadius: '0.9rem',
            background:
              toast.type === 'error'
                ? '#FEF2F2'
                : toast.type === 'warning'
                ? '#FFFBEB'
                : '#F0FDF4',
            border:
              toast.type === 'error'
                ? '1px solid #FECACA'
                : toast.type === 'warning'
                ? '1px solid #FDE68A'
                : '1px solid #BBF7D0',
            color:
              toast.type === 'error'
                ? '#991B1B'
                : toast.type === 'warning'
                ? '#92400E'
                : '#166534',
            boxShadow: '0 15px 30px -10px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.88rem',
            fontWeight: 500,
          }}
        >
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              color: 'inherit',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Drawer Lateral "Mi carrito (N)" idéntico al mockup */}
      {isCartOpen && (
        <div
          className="nexo-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCartOpen(false);
          }}
        >
          <div className="nexo-drawer">
            {/* Header del Drawer */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div className="nexo-logo" style={{ fontSize: '1.25rem' }}>
                NOVA <span>Shop</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ position: 'relative', padding: '0.4rem' }}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  {cantidadTotalCarrito > 0 && (
                    <span className="nexo-cart-badge">
                      {cantidadTotalCarrito}
                    </span>
                  )}
                </div>
                <button
                  className="nexo-icon-btn"
                  onClick={() => setIsCartOpen(false)}
                  title="Cerrar carrito"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Cuerpo del Carrito */}
            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
              <h2
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  marginBottom: '1.25rem',
                }}
              >
                Mi carrito ({cantidadTotalCarrito})
              </h2>

              {carrito.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '3rem 1rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <p style={{ marginBottom: '1rem' }}>
                    Tu carrito está vacío por el momento.
                  </p>
                  <button
                    className="nexo-btn-outline"
                    onClick={() => setIsCartOpen(false)}
                  >
                    Explorar productos
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {carrito.map((item) => (
                    <div
                      key={item.codigoArticulo}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.9rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: '0.75rem',
                          background: '#F3F4F8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <ProductIllustration
                          articulo={{
                            codigo: item.codigoArticulo,
                            nombre: item.nombre,
                          }}
                          size={48}
                        />
                      </div>

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.92rem',
                            marginBottom: '0.2rem',
                          }}
                        >
                          {item.nombre}
                        </div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: '0.98rem',
                            color: 'var(--text)',
                          }}
                        >
                          {formatARS(item.precioUnitario)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                        }}
                      >
                        <div className="nexo-qty-stepper">
                          <button
                            className="nexo-qty-btn"
                            onClick={() =>
                              actualizarCantidadCarrito(
                                item.codigoArticulo,
                                item.cantidad - 1,
                              )
                            }
                          >
                            −
                          </button>
                          <span className="nexo-qty-value">{item.cantidad}</span>
                          <button
                            className="nexo-qty-btn"
                            onClick={() =>
                              actualizarCantidadCarrito(
                                item.codigoArticulo,
                                item.cantidad + 1,
                              )
                            }
                          >
                            +
                          </button>
                        </div>

                        <button
                          className="nexo-icon-btn"
                          style={{ width: 32, height: 32, color: '#9CA3AF' }}
                          title="Eliminar"
                          onClick={() => eliminarDelCarrito(item.codigoArticulo)}
                        >
                          <svg
                            width="17"
                            height="17"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer del Carrito */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderTop: '1px solid var(--border)',
                background: '#FAFAFE',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  Subtotal
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                  {formatARS(subtotalCarrito)}
                </span>
              </div>

              <button
                className="nexo-btn-primary"
                style={{ width: '100%' }}
                disabled={carrito.length === 0 || loading}
                onClick={() =>
                  finalizarCompra(false, () => router.push('/login'))
                }
              >
                {loading ? 'Procesando compra...' : 'Finalizar compra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal "¡Pedido confirmado!" idéntico al mockup de la esquina inferior derecha */}
      {confirmedOrderModal && (
        <div
          className="nexo-modal-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmedOrderModal(null);
          }}
        >
          <div className="nexo-modal-card">
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '9999px',
                border: '3px solid #22C55E',
                color: '#22C55E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: 'var(--text)',
                marginBottom: '0.4rem',
              }}
            >
              ¡Pedido confirmado!
            </h2>

            <p
              style={{
                fontSize: '0.98rem',
                fontWeight: 600,
                color: '#4B5563',
                marginBottom: '0.5rem',
              }}
            >
              N.° de pedido: #NV-{confirmedOrderModal.numero}
            </p>

            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-muted)',
                marginBottom: '1.25rem',
              }}
            >
              {confirmedOrderModal.isReplay
                ? 'Respuesta recuperada por Idempotency-Key (ADR-09): no se volvió a descontar el stock.'
                : `Importe total: ${formatARS(confirmedOrderModal.importeTotal)} · Stock descontado en transacción SQL.`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                className="nexo-btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  setConfirmedOrderModal(null);
                  router.push('/pedidos');
                }}
              >
                Ver pedido
              </button>
              <button
                className="nexo-btn-outline"
                style={{ width: '100%' }}
                onClick={() => {
                  setConfirmedOrderModal(null);
                  router.push('/');
                }}
              >
                Seguir comprando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asistente Inteligente NOVA AI */}
      <NovaAIAssistant />
    </>
  );
}
