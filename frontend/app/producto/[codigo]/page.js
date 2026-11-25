'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '../../../components/Navbar';
import {
  formatARS,
  getProductCategoryAndSpecs,
  ProductIllustration,
} from '../../../components/ProductVisuals';
import { useStore } from '../../../context/StoreContext';

export default function ProductoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const codigo = decodeURIComponent(params?.codigo || '');

  const {
    articulos,
    usuario,
    apiRequest,
    agregarAlCarrito,
    favoritos,
    toggleFavorito,
    setSelectedCategory,
    showToast,
  } = useStore();

  const [articulo, setArticulo] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [thumbVariant, setThumbVariant] = useState(0);
  const [loadingDetalle, setLoadingDetalle] = useState(true);
  const [analisisIA, setAnalisisIA] = useState(null);
  const [analizandoIA, setAnalizandoIA] = useState(false);

  // Estado de comentarios y reseñas de clientes
  const [comentarios, setComentarios] = useState([]);
  const [nuevoTextoComentario, setNuevoTextoComentario] = useState('');
  const [nuevaCalificacion, setNuevaCalificacion] = useState(5);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [resumenOpinionesIA, setResumenOpinionesIA] = useState(null);
  const [resumiendoOpinionesIA, setResumiendoOpinionesIA] = useState(false);

  async function resumirOpinionesConNovaAI() {
    if (!articulo || resumiendoOpinionesIA) return;
    setResumiendoOpinionesIA(true);
    try {
      const { res, data } = await apiRequest('/api/v1/ia/resumir-opiniones', {
        method: 'POST',
        body: JSON.stringify({ codigo: articulo.codigo }),
      });
      if (res.ok) {
        setResumenOpinionesIA(data);
      } else {
        showToast(data.message || 'No se pudieron resumir las opiniones', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResumiendoOpinionesIA(false);
    }
  }

  async function cargarComentariosProducto(cod) {
    try {
      const { res, data } = await apiRequest(`/api/v1/articulos/${cod}/comentarios`);
      if (res.ok && Array.isArray(data)) {
        setComentarios(data);
      }
    } catch (_) {}
  }

  async function publicarComentario(e) {
    e.preventDefault();
    if (!usuario) {
      showToast('Iniciá sesión para dejar tu comentario.', 'warning');
      router.push('/login');
      return;
    }
    if (!nuevoTextoComentario.trim() || enviandoComentario) return;

    setEnviandoComentario(true);
    try {
      const { res, data } = await apiRequest(
        `/api/v1/articulos/${articulo.codigo}/comentarios`,
        {
          method: 'POST',
          body: JSON.stringify({
            calificacion: nuevaCalificacion,
            texto: nuevoTextoComentario.trim(),
          }),
        },
      );
      if (res.ok) {
        setNuevoTextoComentario('');
        setNuevaCalificacion(5);
        setResumenOpinionesIA(null); // Resetear resumen para que el usuario pueda re-analizar incluyendo su comentario nuevo
        showToast('¡Gracias! Tu opinión fue publicada.', 'success');
        await cargarComentariosProducto(articulo.codigo);
      } else {
        showToast(data.message || 'No se pudo publicar el comentario', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setEnviandoComentario(false);
    }
  }

  async function analizarConNovaAI() {
    if (!articulo || analizandoIA) return;
    setAnalizandoIA(true);
    try {
      const { res, data } = await apiRequest('/api/v1/ia/analizar-producto', {
        method: 'POST',
        body: JSON.stringify({ codigo: articulo.codigo }),
      });
      if (res.ok) {
        setAnalisisIA(data);
      } else {
        showToast(data.message || 'No se pudo obtener el análisis de NOVA AI', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAnalizandoIA(false);
    }
  }

  useEffect(() => {
    async function fetchArticulo() {
      setLoadingDetalle(true);
      try {
        const { res, data } = await apiRequest(`/api/v1/articulos/${codigo}`);
        if (res.ok && data?.codigo) {
          setArticulo(data);
        } else {
          const fallback = articulos.find(
            (a) => a.codigo.toLowerCase() === codigo.toLowerCase(),
          );
          if (fallback) setArticulo(fallback);
        }
      } catch (_) {
        const fallback = articulos.find(
          (a) => a.codigo.toLowerCase() === codigo.toLowerCase(),
        );
        if (fallback) setArticulo(fallback);
      } finally {
        setLoadingDetalle(false);
      }
    }
    if (codigo) {
      fetchArticulo();
      cargarComentariosProducto(codigo);
    }
  }, [codigo, articulos]);

  if (loadingDetalle && !articulo) {
    return (
      <div>
        <Navbar />
        <main className="nexo-container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
          Cargando producto...
        </main>
      </div>
    );
  }

  if (!articulo) {
    return (
      <div>
        <Navbar />
        <main className="nexo-container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Producto no encontrado</h2>
          <button className="nexo-btn-primary" onClick={() => router.push('/')}>
            Volver al catálogo
          </button>
        </main>
      </div>
    );
  }

  const meta = getProductCategoryAndSpecs(articulo);
  const isFav = favoritos.includes(articulo.codigo);
  const sinStock = Number(articulo.stock) <= 0;

  return (
    <div>
      <Navbar />

      <main className="nexo-container" style={{ padding: '2rem 1.5rem 4rem' }}>
        {/* Breadcrumb estilo "Inicio > Audio > Auriculares" */}
        <div
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-muted)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Link href="/" style={{ color: 'var(--text-muted)' }}>
            Inicio
          </Link>
          <span>›</span>
          <Link
            href="/categorias"
            onClick={() => setSelectedCategory(meta.categoria)}
            style={{ color: 'var(--text-muted)' }}
          >
            {meta.categoria}
          </Link>
          <span>›</span>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>
            {articulo.nombre}
          </span>
        </div>

        {/* Contenedor Principal del Producto en Grande */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '1.5rem',
            border: '1px solid #ECEEF5',
            padding: '2.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '2.5rem',
            alignItems: 'center',
            boxShadow: '0 20px 40px -15px rgba(31, 41, 55, 0.07)',
          }}
        >
          {/* Columna Izquierda: Imagen Principal + 3 Miniaturas */}
          <div>
            <div
              style={{
                height: 320,
                borderRadius: '1.25rem',
                background: 'linear-gradient(180deg, #F8F7FF 0%, #EEECFA 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                position: 'relative',
              }}
            >
              <ProductIllustration
                articulo={articulo}
                size={230}
                variant={thumbVariant}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    background: '#FFFFFF',
                    color: 'var(--primary)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  {meta.categoria}
                </span>
                {meta.enOferta && (
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      background: '#22C55E',
                      color: '#FFFFFF',
                      boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
                    }}
                  >
                    -{meta.descuentoPct}% OFF
                  </span>
                )}
              </div>
            </div>

            {/* 3 Miniaturas seleccionables como en el mockup */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[0, 1, 2].map((v) => (
                <button
                  key={v}
                  onClick={() => setThumbVariant(v)}
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: '0.85rem',
                    border:
                      thumbVariant === v
                        ? '2px solid var(--primary)'
                        : '1px solid var(--border)',
                    background: thumbVariant === v ? '#F5F3FF' : '#F9FAFB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ProductIllustration
                    articulo={articulo}
                    size={44}
                    variant={v}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Columna Derecha: Info, Rating, Precio, Stepper + Agregar al carrito, Especificaciones */}
          <div>
            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: 'var(--text)',
                marginBottom: '0.45rem',
              }}
            >
              {articulo.nombre}
            </h1>

            {/* Rating con estrella dorada "★ 4.8 (320 reseñas)" */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.9rem',
                marginBottom: '1.15rem',
              }}
            >
              <span style={{ color: '#F59E0B', fontSize: '1.05rem' }}>★</span>
              <strong style={{ color: '#F59E0B' }}>{meta.rating}</strong>
              <span style={{ color: 'var(--text-muted)' }}>
                ({meta.reviews} reseñas)
              </span>
              <span style={{ margin: '0 0.35rem', color: '#D1D5DB' }}>|</span>
              <span
                style={{
                  fontWeight: 700,
                  color: sinStock ? '#EF4444' : '#16A34A',
                }}
              >
                {sinStock
                  ? 'Agotado temporalmente'
                  : `${articulo.stock} unidades disponibles`}
              </span>
            </div>

            {/* Precio grande con oferta coherente en toda la tienda */}
            <div style={{ marginBottom: '1.35rem' }}>
              {meta.enOferta && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    marginBottom: '0.2rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '1.05rem',
                      color: 'var(--text-muted)',
                      textDecoration: 'line-through',
                    }}
                  >
                    {formatARS(meta.precioAnterior)}
                  </span>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '9999px',
                      background: '#DCFCE7',
                      color: '#166534',
                    }}
                  >
                    Ahorrás {formatARS(meta.precioAnterior - Number(articulo.precioUnitario))} (-{meta.descuentoPct}%)
                  </span>
                </div>
              )}
              <div
                style={{
                  fontSize: '2.15rem',
                  fontWeight: 800,
                  color: meta.enOferta ? 'var(--primary)' : 'var(--text)',
                }}
              >
                {formatARS(articulo.precioUnitario)}
              </div>
              <div
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#16A34A',
                  marginTop: '0.2rem',
                }}
              >
                ✓ Envío gratis a todo el país · Hasta 6 cuotas sin interés de {formatARS(Math.round(Number(articulo.precioUnitario) / 6))}
              </div>
            </div>

            {/* Fila Stepper [ - 1 + ] + Botón [ Agregar al carrito ] + Botón [ ♡ ] */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                flexWrap: 'wrap',
                marginBottom: '1.75rem',
              }}
            >
              <div
                className="nexo-qty-stepper"
                style={{ height: 46, padding: '0 0.25rem' }}
              >
                <button
                  className="nexo-qty-btn"
                  style={{ width: 38, height: 42 }}
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                >
                  −
                </button>
                <span className="nexo-qty-value" style={{ minWidth: 38, fontSize: '1rem' }}>
                  {cantidad}
                </span>
                <button
                  className="nexo-qty-btn"
                  style={{ width: 38, height: 42 }}
                  onClick={() =>
                    setCantidad((c) =>
                      Math.min(Math.max(1, articulo.stock), c + 1),
                    )
                  }
                >
                  +
                </button>
              </div>

              <button
                className="nexo-btn-primary"
                style={{ flex: 1, minWidth: 200, height: 46 }}
                disabled={sinStock}
                onClick={() => {
                  if (cantidad > articulo.stock) {
                    showToast(
                      `Solo quedan ${articulo.stock} unidades disponibles en stock.`,
                      'warning',
                    );
                    return;
                  }
                  agregarAlCarrito(articulo, cantidad, true);
                }}
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <span>Agregar al carrito</span>
              </button>

              <button
                onClick={() => toggleFavorito(articulo.codigo)}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)',
                  background: isFav ? '#FEF2F2' : '#F9FAFB',
                  color: isFav ? '#EF4444' : 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Favorito"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill={isFav ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            {/* Lista de Especificaciones con iconos tal como en el mockup */}
            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {meta.specs.map((sp, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.92rem',
                    color: '#374151',
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '0.5rem',
                      background: '#F3F4F8',
                      color: 'var(--primary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    {i === 0 ? '✦' : i === 1 ? '◎' : '⚡'}
                  </span>
                  <span>{sp.label}</span>
                </div>
              ))}
            </div>

            {articulo.descripcion && (
              <p
                style={{
                  marginTop: '1.25rem',
                  fontSize: '0.86rem',
                  color: 'var(--text-muted)',
                }}
              >
                {articulo.descripcion}
              </p>
            )}

            {/* Botón y Tarjeta de Análisis Inteligente NOVA AI */}
            <div style={{ marginTop: '1.5rem' }}>
              {!analisisIA ? (
                <button
                  type="button"
                  onClick={analizarConNovaAI}
                  disabled={analizandoIA}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1.2rem',
                    borderRadius: '0.9rem',
                    border: '1px solid #DDD6FE',
                    background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
                    color: '#5B21B6',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(108, 92, 231, 0.12)',
                  }}
                >
                  <span>✨</span>
                  <span>
                    {analizandoIA
                      ? 'NOVA AI está analizando especificaciones y stock...'
                      : 'Analizar este producto con NOVA AI'}
                  </span>
                </button>
              ) : (
                <div
                  style={{
                    background: 'linear-gradient(180deg, #F5F3FF 0%, #FFFFFF 100%)',
                    border: '1px solid #C4B5FD',
                    borderRadius: '1.15rem',
                    padding: '1.25rem',
                    boxShadow: '0 12px 24px -10px rgba(108, 92, 231, 0.2)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontWeight: 800,
                        color: '#5B21B6',
                        fontSize: '0.95rem',
                      }}
                    >
                      <span>✨</span>
                      <span>Análisis Inteligente NOVA AI</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        background: '#EDE9FE',
                        color: '#6C5CE7',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                      }}
                    >
                      ⚡ {analisisIA.motor || 'Google Gemini API'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: '#374151', marginBottom: '0.75rem' }}>
                    <strong>¿Para quién es ideal?:</strong> {analisisIA.perfilIdeal}
                  </div>

                  <div style={{ fontSize: '0.84rem', color: '#374151', marginBottom: '0.75rem' }}>
                    <strong>Relación Precio-Calidad:</strong>{' '}
                    <span style={{ color: '#16A34A', fontWeight: 700 }}>
                      {analisisIA.veredictoPrecioCalidad}
                    </span>
                  </div>

                  <ul
                    style={{
                      margin: '0 0 1rem 1.1rem',
                      fontSize: '0.82rem',
                      color: '#4B5563',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                    }}
                  >
                    {analisisIA.puntosFuertes?.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>

                  {analisisIA.productoComplementario && (
                    <div
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.85rem',
                        padding: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          cursor: 'pointer',
                        }}
                        onClick={() =>
                          router.push(`/producto/${analisisIA.productoComplementario.codigo}`)
                        }
                      >
                        <div style={{ width: 46, height: 46, borderRadius: '0.5rem', overflow: 'hidden' }}>
                          <ProductIllustration
                            articulo={analisisIA.productoComplementario}
                            size={46}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6C5CE7' }}>
                            💡 COMBINALO CON:
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                            {analisisIA.productoComplementario.nombre}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 700 }}>
                            {formatARS(analisisIA.productoComplementario.precioUnitario)} ·{' '}
                            {analisisIA.productoComplementario.stock} disponibles
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          agregarAlCarrito(articulo, 1, false);
                          agregarAlCarrito(analisisIA.productoComplementario, 1, true);
                          showToast('¡Ambos productos agregados al carrito!', 'success');
                        }}
                        style={{
                          background: '#6C5CE7',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '0.65rem',
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Llevar ambos ({formatARS(analisisIA.precioComboSugerido)})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sección de Opiniones y Comentarios de Clientes */}
        <section
          style={{
            marginTop: '2.5rem',
            background: 'var(--surface)',
            borderRadius: '1.5rem',
            border: '1px solid #ECEEF5',
            padding: '2.25rem',
            boxShadow: '0 20px 40px -15px rgba(31, 41, 55, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.75rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>
                Opiniones del producto ({comentarios.length})
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Experiencias verificadas de clientes que compraron en NOVA Shop
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {comentarios.length > 0 && !resumenOpinionesIA && (
                <button
                  type="button"
                  onClick={resumirOpinionesConNovaAI}
                  disabled={resumiendoOpinionesIA}
                  style={{
                    padding: '0.55rem 1.05rem',
                    borderRadius: '9999px',
                    border: '1px solid #C4B5FD',
                    background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
                    color: '#5B21B6',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 12px rgba(108, 92, 231, 0.12)',
                  }}
                >
                  <span>✨</span>
                  <span>
                    {resumiendoOpinionesIA
                      ? 'NOVA AI está leyendo las opiniones...'
                      : 'Resumir opiniones con NOVA AI'}
                  </span>
                </button>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  padding: '0.45rem 0.95rem',
                  borderRadius: '9999px',
                  fontWeight: 800,
                  color: '#B45309',
                }}
              >
                <span style={{ color: '#F59E0B', fontSize: '1.1rem' }}>★★★★★</span>
                <span>{meta.rating} / 5.0</span>
              </div>
            </div>
          </div>

          {/* Tarjeta de Resumen de Opiniones Generado por NOVA AI (estilo Mercado Libre / Amazon) */}
          {resumenOpinionesIA && (
            <div
              style={{
                background: 'linear-gradient(135deg, #F5F3FF 0%, #FAFAFE 100%)',
                border: '1px solid #C4B5FD',
                borderRadius: '1.15rem',
                padding: '1.25rem 1.4rem',
                marginBottom: '1.75rem',
                boxShadow: '0 10px 24px -12px rgba(108, 92, 231, 0.22)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '0.65rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 800,
                    color: '#5B21B6',
                    fontSize: '0.96rem',
                  }}
                >
                  <span>✨</span>
                  <span>
                    Resumen de opiniones por IA ({resumenOpinionesIA.totalOpinionesAnalizadas}{' '}
                    {resumenOpinionesIA.totalOpinionesAnalizadas === 1 ? 'comentario' : 'comentarios'} en PostgreSQL)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.73rem',
                      fontWeight: 800,
                      background: '#DCFCE7',
                      color: '#166534',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '9999px',
                    }}
                  >
                    ✓ {resumenOpinionesIA.sentimientoGeneral}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: '#EDE9FE',
                      color: '#6C5CE7',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                    }}
                  >
                    ⚡ {resumenOpinionesIA.motor}
                  </span>
                </div>
              </div>

              <p
                style={{
                  fontSize: '0.88rem',
                  color: '#1F2937',
                  lineHeight: 1.55,
                  marginBottom: '0.75rem',
                }}
              >
                {resumenOpinionesIA.resumenEjecutivo}
              </p>

              {resumenOpinionesIA.aspectosDestacados?.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    flexWrap: 'wrap',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#6B7280' }}>
                    Lo más valorado:
                  </span>
                  {resumenOpinionesIA.aspectosDestacados.map((asp, i) => (
                    <span
                      key={i}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #DDD6FE',
                        color: '#5B21B6',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '0.18rem 0.65rem',
                        borderRadius: '9999px',
                      }}
                    >
                      ✦ {asp}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563' }}>
                <strong>Veredicto de la comunidad:</strong> {resumenOpinionesIA.conclusionComunidad}
              </div>
            </div>
          )}

          {/* Formulario para agregar un comentario */}
          <form
            onSubmit={publicarComentario}
            style={{
              background: '#F9FAFB',
              border: '1px solid var(--border)',
              borderRadius: '1.1rem',
              padding: '1.25rem',
              marginBottom: '1.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '0.85rem',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                {usuario
                  ? `Dejá tu opinión como ${usuario.nombreCliente || usuario.username}`
                  : '¿Ya probaste este producto? Dejá tu opinión'}
              </span>

              {/* Selector de estrellas (1 a 5) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>
                  Calificación:
                </span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNuevaCalificacion(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.35rem',
                      cursor: 'pointer',
                      color: star <= nuevaCalificacion ? '#F59E0B' : '#D1D5DB',
                      lineHeight: 1,
                    }}
                    title={`${star} estrellas`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="nexo-input"
                style={{ flex: 1, minWidth: '240px', paddingLeft: '1rem', background: '#FFFFFF' }}
                placeholder="Contanos qué te pareció la calidad, el rendimiento o el envío..."
                value={nuevoTextoComentario}
                onChange={(e) => setNuevoTextoComentario(e.target.value)}
                required
              />
              <button
                type="submit"
                className="nexo-btn-primary"
                disabled={enviandoComentario || !nuevoTextoComentario.trim()}
              >
                {enviandoComentario ? 'Publicando...' : 'Publicar comentario'}
              </button>
            </div>
          </form>

          {/* Listado de comentarios */}
          {comentarios.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
              Sé el primero en dejar una opinión sobre este producto.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {comentarios.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '1.15rem 1.25rem',
                    borderRadius: '1rem',
                    border: '1px solid #ECEEF5',
                    background: '#FAFAFE',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginBottom: '0.45rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: '#EDE9FE',
                          color: 'var(--primary)',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {(c.nombreCliente || c.usuario || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.92rem' }}>{c.nombreCliente}</strong>
                        <span
                          style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            color: '#166534',
                            background: '#DCFCE7',
                            padding: '0.12rem 0.5rem',
                            borderRadius: '9999px',
                          }}
                        >
                          ✓ Compra verificada
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ color: '#F59E0B', fontSize: '0.95rem', letterSpacing: '1px' }}>
                        {'★'.repeat(c.calificacion)}
                        {'☆'.repeat(Math.max(0, 5 - c.calificacion))}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(c.fecha).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: '#374151', paddingLeft: '2.7rem' }}>
                    {c.texto}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
