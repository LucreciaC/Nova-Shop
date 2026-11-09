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
    apiRequest,
    agregarAlCarrito,
    favoritos,
    toggleFavorito,
    showToast,
  } = useStore();

  const [articulo, setArticulo] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [thumbVariant, setThumbVariant] = useState(0);
  const [loadingDetalle, setLoadingDetalle] = useState(true);

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
    if (codigo) fetchArticulo();
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
          <span>{meta.categoria}</span>
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
              <span
                style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  background: '#FFFFFF',
                  color: 'var(--primary)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                Código: {articulo.codigo}
              </span>
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

            {/* Precio grande */}
            <div
              style={{
                fontSize: '2.15rem',
                fontWeight: 800,
                color: 'var(--text)',
                marginBottom: '1.35rem',
              }}
            >
              {formatARS(articulo.precioUnitario)}
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
          </div>
        </div>
      </main>
    </div>
  );
}
