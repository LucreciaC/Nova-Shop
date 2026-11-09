'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { formatARS, ProductIllustration } from '../../components/ProductVisuals';
import { useStore } from '../../context/StoreContext';

export default function MisPedidosPage() {
  const router = useRouter();
  const { usuario, token, pedidos, cargarPedidos, apiRequest, showToast } = useStore();
  const [pedidoDetalleModal, setPedidoDetalleModal] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  async function verDetallePedidoIndividual(numero) {
    setCargandoDetalle(true);
    try {
      const { res, data } = await apiRequest(`/api/v1/pedidos/${numero}`);
      if (res.ok) {
        setPedidoDetalleModal(data);
      } else {
        showToast(data.message || `Error al consultar el pedido #${numero}`, 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCargandoDetalle(false);
    }
  }

  useEffect(() => {
    if (token) {
      cargarPedidos();
    }
  }, [token]);

  if (!usuario) {
    return (
      <div>
        <Navbar />
        <main className="nexo-container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Iniciá sesión para ver tus pedidos</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Tus compras registradas en PostgreSQL aparecerán aquí.
          </p>
          <button className="nexo-btn-primary" onClick={() => router.push('/login')}>
            Ir a Iniciar sesión
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
            <h1>
              {usuario.rol === 'administrador'
                ? 'Historial General de Pedidos'
                : 'Mis Pedidos Confirmados'}
            </h1>
            <p style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              Contrato SOA: GET /api/v1/pedidos · Sin cancelación ni devolución (SUP-05)
            </p>
          </div>
          <button className="nexo-btn-outline" onClick={() => cargarPedidos()}>
            Actualizar lista
          </button>
        </div>

        {pedidos.length === 0 ? (
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '1.25rem',
              padding: '3.5rem 2rem',
              textAlign: 'center',
              border: '1px solid var(--border)',
            }}
          >
            <h3 style={{ marginBottom: '0.5rem' }}>Todavía no registraste pedidos</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Agregá productos al carrito y finalizá tu primera compra.
            </p>
            <button className="nexo-btn-primary" onClick={() => router.push('/')}>
              Ver catálogo
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {pedidos.map((p) => (
              <div
                key={p.numero}
                style={{
                  background: 'var(--surface)',
                  borderRadius: '1.25rem',
                  border: '1px solid #ECEEF5',
                  padding: '1.5rem',
                  boxShadow: '0 8px 20px -10px rgba(31, 41, 55, 0.06)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span
                      style={{
                        background: '#DCFCE7',
                        color: '#166534',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        padding: '0.25rem 0.7rem',
                        borderRadius: '9999px',
                      }}
                    >
                      ✓ Confirmado
                    </span>
                    <strong style={{ fontSize: '1.1rem' }}>
                      Pedido #NX-{p.numero}
                    </strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(p.fecha).toLocaleString('es-AR')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      Cliente: <strong>{p.nombreCliente}</strong> ({p.usuario})
                    </span>
                    <button
                      className="nexo-btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      disabled={cargandoDetalle}
                      onClick={() => verDetallePedidoIndividual(p.numero)}
                    >
                      Ver detalle (GET /pedidos/{p.numero})
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {p.lineas.map((l, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '0.6rem',
                            background: '#F3F4F8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ProductIllustration
                            articulo={{
                              codigo: l.codigoArticulo,
                              nombre: l.nombreArticulo,
                            }}
                            size={36}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {l.nombreArticulo || l.codigoArticulo}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Código: {l.codigoArticulo} · Cantidad: {l.cantidad} u. x{' '}
                            {formatARS(l.precioUnitario)}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontWeight: 700 }}>
                        {formatARS(l.subtotal)}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Importe Total (RF-09)
                  </span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {formatARS(p.importeTotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Detalle Individual de Pedido (Contrato GET /api/v1/pedidos/{numero} - RF-08) */}
      {pedidoDetalleModal && (
        <div
          className="nexo-modal-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPedidoDetalleModal(null);
          }}
        >
          <div className="nexo-modal-card" style={{ maxWidth: 520, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                Detalle del Pedido #NX-{pedidoDetalleModal.numero}
              </h3>
              <button
                className="nexo-icon-btn"
                onClick={() => setPedidoDetalleModal(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'grid', gap: '0.25rem' }}>
              <div><strong>Contrato SOA:</strong> <code>GET /api/v1/pedidos/{pedidoDetalleModal.numero}</code></div>
              <div><strong>Fecha:</strong> {new Date(pedidoDetalleModal.fecha).toLocaleString('es-AR')}</div>
              <div><strong>Usuario:</strong> {pedidoDetalleModal.usuario}</div>
              <div><strong>Nombre del Cliente:</strong> {pedidoDetalleModal.nombreCliente}</div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '0.85rem 0', marginBottom: '1rem' }}>
              {pedidoDetalleModal.lineas?.map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.9rem' }}>
                  <span>
                    <strong>{l.codigoArticulo}</strong> ({l.nombreArticulo || 'Artículo'}) × {l.cantidad} u. ({formatARS(l.precioUnitario)} c/u)
                  </span>
                  <strong>{formatARS(l.subtotal)}</strong>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontWeight: 700 }}>Importe Total (RF-09):</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                {formatARS(pedidoDetalleModal.importeTotal)}
              </span>
            </div>

            <button
              className="nexo-btn-primary"
              style={{ width: '100%' }}
              onClick={() => setPedidoDetalleModal(null)}
            >
              Cerrar comprobante
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
