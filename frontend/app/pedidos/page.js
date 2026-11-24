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
  const [ledgerModal, setLedgerModal] = useState(null);
  const [verificandoLedger, setVerificandoLedger] = useState(false);

  const esAdmin =
    usuario?.rol === 'administrador' || usuario?.rol === 'ADMIN';

  async function abrirExploradorBlockchain() {
    setVerificandoLedger(true);
    try {
      const { res, data } = await apiRequest('/api/v1/pedidos/blockchain/ledger');
      if (res.ok) {
        setLedgerModal(data);
      } else {
        showToast(data.message || 'No se pudo verificar la cadena Blockchain', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setVerificandoLedger(false);
    }
  }

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
                : 'Mis Compras'}
            </h1>
            <p style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              Tus pedidos confirmados con protección e inmutabilidad Blockchain SHA-256
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            {esAdmin && (
              <button
                className="nexo-btn-primary"
                onClick={abrirExploradorBlockchain}
                disabled={verificandoLedger}
                style={{
                  background: 'linear-gradient(135deg, #4C1D95 0%, #6C5CE7 100%)',
                }}
              >
                {verificandoLedger
                  ? 'Verificando hashes...'
                  : '⛓️ Verificar Integridad Blockchain'}
              </button>
            )}
            <button className="nexo-btn-outline" onClick={() => cargarPedidos()}>
              Actualizar lista
            </button>
          </div>
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
                      Pedido #NV-{p.numero}
                    </strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(p.fecha).toLocaleString('es-AR')}
                    </span>
                    {p.blockchain && (
                      <span
                        style={{
                          background: '#EDE9FE',
                          color: '#5B21B6',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.65rem',
                          borderRadius: '9999px',
                        }}
                      >
                        ⛓️ Protegido en Blockchain (Bloque #{p.blockchain.blockIndex})
                      </span>
                    )}
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
                      Ver comprobante
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
                    Importe Total
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
                Detalle del Pedido #NV-{pedidoDetalleModal.numero}
              </h3>
              <button
                className="nexo-icon-btn"
                onClick={() => setPedidoDetalleModal(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'grid', gap: '0.25rem' }}>
              <div><strong>Fecha:</strong> {new Date(pedidoDetalleModal.fecha).toLocaleString('es-AR')}</div>
              <div><strong>Usuario:</strong> {pedidoDetalleModal.usuario}</div>
              <div><strong>Cliente:</strong> {pedidoDetalleModal.nombreCliente}</div>
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
              <span style={{ fontWeight: 700 }}>Importe Total:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                {formatARS(pedidoDetalleModal.importeTotal)}
              </span>
            </div>

            {pedidoDetalleModal.blockchain && (
              <div
                style={{
                  background: '#F5F3FF',
                  border: '1px solid #DDD6FE',
                  borderRadius: '0.9rem',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ fontWeight: 800, color: '#5B21B6', marginBottom: '0.35rem' }}>
                  ⛓️ Sello de Inmutabilidad Blockchain (Bloque #{pedidoDetalleModal.blockchain.blockIndex})
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.73rem', color: '#374151', wordBreak: 'break-all', display: 'grid', gap: '0.25rem' }}>
                  <div><strong>Block Hash:</strong> 0x{pedidoDetalleModal.blockchain.blockHash}</div>
                  <div><strong>Prev Hash:</strong> 0x{pedidoDetalleModal.blockchain.previousHash}</div>
                  <div><strong>Payload Hash:</strong> 0x{pedidoDetalleModal.blockchain.payloadHash}</div>
                  <div><strong>Nonce (PoW):</strong> {pedidoDetalleModal.blockchain.nonce} · <strong>Estado:</strong> {pedidoDetalleModal.blockchain.verified ? '✓ ÍNTEGRO' : '⚠ ALTERADO'}</div>
                </div>
              </div>
            )}

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

      {/* Modal Explorador de Blockchain Ledger (SUP-05) */}
      {ledgerModal && (
        <div
          className="nexo-modal-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLedgerModal(null);
          }}
        >
          <div
            className="nexo-modal-card"
            style={{
              maxWidth: 740,
              width: '95%',
              maxHeight: '85vh',
              overflowY: 'auto',
              textAlign: 'left',
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
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                  {usuario.rol === 'administrador'
                    ? '⛓️ Auditoría Global Blockchain — NOVA Shop (Vista Administrador)'
                    : '⛓️ Verificación Blockchain de Mis Compras'}
                </h3>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                  {usuario.rol === 'administrador'
                    ? 'Inspección completa de la cadena de bloques de todos los pedidos del sistema'
                    : `Certificados criptográficos SHA-256 de tus compras (${usuario.username}) verificados contra la cadena global`}
                </p>
              </div>
              <button
                className="nexo-icon-btn"
                onClick={() => setLedgerModal(null)}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: '0.9rem 1.15rem',
                borderRadius: '0.9rem',
                marginBottom: '1.25rem',
                background: ledgerModal.cadenaIntegra ? '#F0FDF4' : '#FEF2F2',
                border: ledgerModal.cadenaIntegra
                  ? '1px solid #BBF7D0'
                  : '1px solid #FECACA',
                color: ledgerModal.cadenaIntegra ? '#166534' : '#991B1B',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                fontWeight: 700,
                fontSize: '0.88rem',
              }}
            >
              <span>
                {ledgerModal.cadenaIntegra
                  ? usuario.rol === 'administrador'
                    ? '✓ CADENA GLOBAL ÍNTEGRA: Ningún pedido ni importe fue adulterado'
                    : '✓ TUS COMPRAS ESTÁN VERIFICADAS: Cadena criptográfica íntegra'
                  : '⚠ ALERTA: Se detectó alteración en la cadena de bloques'}
              </span>
              <span>
                {usuario.rol === 'administrador'
                  ? `${ledgerModal.totalBloques} bloques en la red · ${ledgerModal.algoritmo}`
                  : `${ledgerModal.bloquesMostrados ?? ledgerModal.bloques?.length ?? 0} compras propias verificadas`}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {ledgerModal.bloques?.map((b) => (
                <div
                  key={b.blockIndex}
                  style={{
                    background: b.blockIndex === 0 ? '#F9FAFB' : '#FAFAFE',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.95rem',
                    padding: '1rem 1.15rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span
                        style={{
                          background: b.blockIndex === 0 ? '#374151' : '#6C5CE7',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '0.76rem',
                          padding: '0.2rem 0.65rem',
                          borderRadius: '9999px',
                        }}
                      >
                        Bloque #{b.blockIndex}
                      </span>
                      <strong>
                        {b.blockIndex === 0
                          ? 'Bloque Génesis (Inicialización SOA)'
                          : `Pedido #NV-${b.pedidoNumero} (${b.datos?.usuario || ''})`}
                      </strong>
                    </div>
                    <span
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: b.valido ? '#16A34A' : '#DC2626',
                      }}
                    >
                      {b.valido ? '✓ Enlace SHA-256 Válido' : `⚠ ${b.motivoFallo}`}
                    </span>
                  </div>

                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.73rem',
                      color: '#4B5563',
                      wordBreak: 'break-all',
                      display: 'grid',
                      gap: '0.2rem',
                    }}
                  >
                    <div>
                      <strong>Hash Actual:</strong> 0x{b.blockHash}
                    </div>
                    <div>
                      <strong>Hash Anterior:</strong> 0x{b.previousHash}
                    </div>
                    {b.blockIndex > 0 && (
                      <div>
                        <strong>Payload Hash:</strong> 0x{b.payloadHash} ·{' '}
                        <strong>Nonce:</strong> {b.nonce} ·{' '}
                        <strong>Importe:</strong> {formatARS(b.datos?.importeTotal || 0)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
