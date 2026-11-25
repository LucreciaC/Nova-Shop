'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatARS, ProductIllustration } from './ProductVisuals';

const SUGERENCIAS_RAPIDAS = [
  'Armame un combo gamer con $250.000',
  'Comparar teclado y mouse',
  'Recomendame algo para estudiar o programar',
  'Busco algo por menos de $150.000',
];

export default function NovaAIAssistant() {
  const router = useRouter();
  const { apiRequest, agregarAlCarrito, showToast } = useStore();

  const [abierto, setAbierto] = useState(false);
  const [input, setInput] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [mensajes, setMensajes] = useState([
    {
      rol: 'ia',
      texto:
        '¡Hola! Soy NOVA AI ✨. Consulto el stock y precios en PostgreSQL en tiempo real. Puedo armarte combos por presupuesto, comparar productos o recomendarte el equipo ideal. ¿En qué te ayudo?',
      productos: [],
    },
  ]);

  async function enviarConsulta(textoConsulta) {
    const pregunta = (textoConsulta ?? input).trim();
    if (!pregunta || consultando) return;

    setInput('');
    setMensajes((prev) => [...prev, { rol: 'usuario', texto: pregunta }]);
    setConsultando(true);

    try {
      const { res, data } = await apiRequest('/api/v1/ia/asistente', {
        method: 'POST',
        body: JSON.stringify({ mensaje: pregunta }),
      });

      if (res.ok) {
        setMensajes((prev) => [
          ...prev,
          {
            rol: 'ia',
            texto: data.respuesta,
            productos: Array.isArray(data.productosRecomendados)
              ? data.productosRecomendados
              : [],
            resumenCombo: data.resumenCombo || null,
            motor: data.motor,
            instanciaConsultada: data.instanciaConsultada,
          },
        ]);
      } else {
        setMensajes((prev) => [
          ...prev,
          {
            rol: 'ia',
            texto:
              data.message ||
              'En este momento no pude consultar el catálogo. Intentá nuevamente en unos segundos.',
            productos: [],
          },
        ]);
      }
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        {
          rol: 'ia',
          texto: `No se pudo conectar con el servicio de IA en el API Gateway: ${err.message}`,
          productos: [],
        },
      ]);
    } finally {
      setConsultando(false);
    }
  }

  function agregarComboCompleto(productos) {
    if (!Array.isArray(productos) || productos.length === 0) return;
    productos.forEach((art, idx) => {
      agregarAlCarrito(art, 1, idx === productos.length - 1);
    });
    showToast(`¡Combo de ${productos.length} productos agregado al carrito!`, 'success');
  }

  return (
    <>
      {/* Botón Flotante para abrir NOVA AI */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        title="Asistente de Compras con Inteligencia Artificial"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 70,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.88rem 1.35rem',
          borderRadius: '9999px',
          border: '1px solid rgba(255,255,255,0.25)',
          background: 'linear-gradient(135deg, #4C1D95 0%, #6C5CE7 55%, #8B7CFF 100%)',
          color: '#FFFFFF',
          fontWeight: 700,
          fontSize: '0.93rem',
          cursor: 'pointer',
          boxShadow: '0 16px 32px -6px rgba(108, 92, 231, 0.6)',
          transition: 'transform 0.2s ease',
        }}
      >
        <span style={{ fontSize: '1.15rem' }}>✨</span>
        <span>{abierto ? 'Cerrar NOVA AI' : 'NOVA AI Asistente'}</span>
      </button>

      {/* Ventana de Chat de NOVA AI */}
      {abierto && (
        <div
          style={{
            position: 'fixed',
            bottom: '5.25rem',
            right: '1.5rem',
            zIndex: 75,
            width: '400px',
            maxWidth: 'calc(100vw - 2rem)',
            height: '580px',
            maxHeight: 'calc(100vh - 7rem)',
            background: '#FFFFFF',
            borderRadius: '1.4rem',
            border: '1px solid #ECEEF5',
            boxShadow: '0 25px 50px -12px rgba(31, 41, 55, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Cabecera */}
          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'linear-gradient(135deg, #3B0764 0%, #6C5CE7 100%)',
              color: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.15rem',
                }}
              >
                ✨
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>
                  NOVA AI · Asistente Inteligente
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#EDE9FE',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#22C55E',
                      display: 'inline-block',
                    }}
                  />
                  <span>RAG conectado a PostgreSQL en vivo</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAbierto(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>

          {/* Lista de mensajes */}
          <div
            style={{
              flex: 1,
              padding: '1rem',
              overflowY: 'auto',
              background: '#F7F7FB',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem',
            }}
          >
            {mensajes.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.rol === 'usuario' ? 'flex-end' : 'flex-start',
                  maxWidth: '93%',
                }}
              >
                <div
                  style={{
                    padding: '0.78rem 0.98rem',
                    borderRadius:
                      m.rol === 'usuario'
                        ? '1rem 1rem 0.25rem 1rem'
                        : '1rem 1rem 1rem 0.25rem',
                    background: m.rol === 'usuario' ? '#6C5CE7' : '#FFFFFF',
                    color: m.rol === 'usuario' ? '#FFFFFF' : '#1F2937',
                    fontSize: '0.85rem',
                    lineHeight: 1.48,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: m.rol === 'usuario' ? 'none' : '1px solid #ECEEF5',
                  }}
                >
                  {m.texto.replace(/\*\*/g, '')}
                </div>

                {/* Etiqueta sutil de trazabilidad SOA (qué instancia respondió) */}
                {m.instanciaConsultada && (
                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: '#6B7280',
                      marginTop: '0.25rem',
                      paddingLeft: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>⚡ Stock verificado vía</span>
                    <strong style={{ color: '#6C5CE7' }}>
                      {m.instanciaConsultada}
                    </strong>
                  </div>
                )}

                {/* Tarjetas de Productos Recomendados por la IA */}
                {m.productos && m.productos.length > 0 && (
                  <div
                    style={{
                      marginTop: '0.55rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    {m.productos.map((art) => (
                      <div
                        key={art.codigo}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: '0.85rem',
                          padding: '0.6rem 0.75rem',
                          border: '1px solid #E5E7EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.6rem',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            cursor: 'pointer',
                            flex: 1,
                          }}
                          onClick={() => {
                            setAbierto(false);
                            router.push(`/producto/${art.codigo}`);
                          }}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: '0.5rem',
                              background: '#F3F4F8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            <ProductIllustration articulo={art} size={44} />
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                color: '#1F2937',
                              }}
                            >
                              {art.nombre}
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                color: '#6C5CE7',
                              }}
                            >
                              {formatARS(art.precioUnitario)} ·{' '}
                              <span style={{ color: '#16A34A', fontWeight: 600 }}>
                                {art.stock} disp.
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => agregarAlCarrito(art, 1, true)}
                          disabled={Number(art.stock) <= 0}
                          style={{
                            background: '#6C5CE7',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '0.55rem',
                            padding: '0.4rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          + Carrito
                        </button>
                      </div>
                    ))}

                    {/* Si es un Combo armado por la IA, botón de 1 clic para llevar todo el combo */}
                    {m.resumenCombo && m.productos.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => agregarComboCompleto(m.productos)}
                        style={{
                          marginTop: '0.2rem',
                          background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '0.75rem',
                          padding: '0.6rem 0.9rem',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 6px 14px rgba(34, 197, 94, 0.3)',
                        }}
                      >
                        <span>🛒 Agregar combo completo ({formatARS(m.resumenCombo.totalCombo)})</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {consultando && (
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#6B7280',
                  fontStyle: 'italic',
                }}
              >
                NOVA AI está consultando el catálogo en tiempo real...
              </div>
            )}

            {/* Chips de preguntas sugeridas */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.4rem',
                marginTop: '0.25rem',
              }}
            >
              {SUGERENCIAS_RAPIDAS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => enviarConsulta(sug)}
                  disabled={consultando}
                  style={{
                    background: '#EDE9FE',
                    color: '#5B21B6',
                    border: '1px solid #DDD6FE',
                    borderRadius: '9999px',
                    padding: '0.32rem 0.7rem',
                    fontSize: '0.73rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  ✨ {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Input de envío */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviarConsulta();
            }}
            style={{
              padding: '0.75rem',
              background: '#FFFFFF',
              borderTop: '1px solid #ECEEF5',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej: Armame un combo gamer con $250.000..."
              style={{
                flex: 1,
                padding: '0.6rem 0.85rem',
                borderRadius: '9999px',
                border: '1px solid #D1D5DB',
                fontSize: '0.84rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={consultando || !input.trim()}
              style={{
                background: '#6C5CE7',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '9999px',
                padding: '0 1rem',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
