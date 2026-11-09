'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import {
  formatARS,
  getProductCategoryAndSpecs,
  ProductIllustration,
} from '../components/ProductVisuals';
import { generateUUID, useStore } from '../context/StoreContext';

const CATEGORIAS = [
  { id: 'Informática', label: 'Informática', icon: 'laptop' },
  { id: 'Audio', label: 'Audio', icon: 'audio' },
  { id: 'Gaming', label: 'Gaming', icon: 'gaming' },
  { id: 'Hogar', label: 'Hogar', icon: 'home' },
  { id: 'Accesorios', label: 'Accesorios', icon: 'tag' },
];

function CategoryIcon({ type }) {
  if (type === 'laptop') {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    );
  }
  if (type === 'audio') {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    );
  }
  if (type === 'gaming') {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="6" y1="12" x2="10" y2="12" />
        <line x1="8" y1="10" x2="8" y2="14" />
        <line x1="15" y1="13" x2="15.01" y2="13" />
        <line x1="18" y1="11" x2="18.01" y2="11" />
        <rect x="2" y="6" width="20" height="12" rx="4" />
      </svg>
    );
  }
  if (type === 'home') {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  }
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const {
    articulos,
    cargarCatalogo,
    agregarAlCarrito,
    favoritos,
    toggleFavorito,
    searchQuery,
    selectedCategory,
    setSelectedCategory,
    usuario,
    apiRequest,
    showToast,
    loading,
    setLoading,
  } = useStore();

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const articulosFiltrados = articulos.filter((art) => {
    const meta = getProductCategoryAndSpecs(art);
    const matchesCategory =
      selectedCategory === 'Todas' || meta.categoria === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      art.nombre.toLowerCase().includes(q) ||
      art.codigo.toLowerCase().includes(q) ||
      (art.descripcion || '').toLowerCase().includes(q) ||
      meta.categoria.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  async function probarEscenarioConcurrenciaTP() {
    if (!usuario) {
      showToast('Iniciá sesión primero para probar la concurrencia de stock.', 'warning');
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const req1 = apiRequest('/api/v1/pedidos', {
        method: 'POST',
        headers: { 'Idempotency-Key': generateUUID() },
        body: JSON.stringify({
          lineas: [{ codigoArticulo: 'A-1001', cantidad: 4 }],
        }),
      });
      const req2 = apiRequest('/api/v1/pedidos', {
        method: 'POST',
        headers: { 'Idempotency-Key': generateUUID() },
        body: JSON.stringify({
          lineas: [{ codigoArticulo: 'A-1001', cantidad: 4 }],
        }),
      });

      const [r1, r2] = await Promise.all([req1, req2]);
      await cargarCatalogo();

      showToast(
        `Concurrencia sobre A-1001 (2x4 u.): Compra 1 -> HTTP ${r1.res.status} | Compra 2 -> HTTP ${r2.res.status}`,
        'info',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Navbar />

      <main className="nexo-container" style={{ paddingBottom: '4rem' }}>
        {/* 1. Hero Banner Principal ("Tecnología que te conecta") */}
        <section className="nexo-hero">
          <div style={{ zIndex: 2 }}>
            <h1 className="nexo-hero-title">
              Tecnología
              <br />
              que te conecta
            </h1>
            <p className="nexo-hero-subtitle">
              Descubrí los mejores productos al mejor precio.
            </p>
            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
              <a href="#catalogo" className="nexo-btn-primary">
                <span>Ver catálogo</span>
                <span>→</span>
              </a>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Bloques de podio 3D decorativos como en la imagen */}
            <div
              style={{
                position: 'absolute',
                width: 240,
                height: 240,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,124,255,0.35) 0%, transparent 70%)',
              }}
            />
            <div
              style={{
                cursor: 'pointer',
                transform: 'rotate(-8deg)',
                filter: 'drop-shadow(0 25px 30px rgba(0,0,0,0.55))',
              }}
              onClick={() => router.push('/producto/A-1001')}
            >
              <ProductIllustration
                articulo={{ codigo: 'A-1001', nombre: 'Auriculares Bluetooth' }}
                size={230}
              />
            </div>
          </div>
        </section>

        {/* 2. Franja de Beneficios (Envío, Pagos, Soporte, Compras protegidas) */}
        <section className="nexo-trust-strip">
          <div className="nexo-trust-item">
            <div className="nexo-trust-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                Envío a todo el país
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Rápido y seguro
              </div>
            </div>
          </div>

          <div className="nexo-trust-item">
            <div className="nexo-trust-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                Pagos seguros
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Diversos medios
              </div>
            </div>
          </div>

          <div className="nexo-trust-item">
            <div className="nexo-trust-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                Soporte 24/7
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Siempre con vos
              </div>
            </div>
          </div>

          <div className="nexo-trust-item">
            <div className="nexo-trust-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                Compras protegidas
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Garantía de satisfacción
              </div>
            </div>
          </div>
        </section>

        {/* 3. Categorías (Informática, Audio, Gaming, Hogar, Accesorios) */}
        <section id="categorias" style={{ marginBottom: '2.25rem' }}>
          <div className="nexo-section-title" style={{ marginBottom: '0.9rem' }}>
            <span>Categorías</span>
            <button
              onClick={() => router.push('/categorias')}
              style={{
                fontSize: '0.86rem',
                fontWeight: 700,
                color: 'var(--primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Explorar todas las categorías →
            </button>
          </div>
          <div className="nexo-categories" style={{ marginBottom: 0 }}>
            {CATEGORIAS.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const count = articulos.filter(
                (a) => getProductCategoryAndSpecs(a).categoria === cat.id,
              ).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`nexo-cat-card ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    const nextCat = isActive ? 'Todas' : cat.id;
                    setSelectedCategory(nextCat);
                    const el = document.getElementById('catalogo');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <div style={{ color: 'var(--primary)' }}>
                    <CategoryIcon type={cat.icon} />
                  </div>
                  <span>{cat.label}</span>
                  <span style={{ fontSize: '0.73rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    {count} {count === 1 ? 'producto' : 'productos'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Grilla de Productos Destacados */}
        <section id="catalogo">
          <div className="nexo-section-title">
            <div>
              <span>
                {selectedCategory === 'Todas'
                  ? 'Destacados'
                  : `Categoría: ${selectedCategory}`}
              </span>
              {selectedCategory !== 'Todas' && (
                <button
                  onClick={() => setSelectedCategory('Todas')}
                  style={{
                    marginLeft: '0.85rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Ver todos
                </button>
              )}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>
              {articulosFiltrados.length} productos disponibles
            </span>
          </div>

          {articulosFiltrados.length === 0 ? (
            <div
              style={{
                background: 'var(--surface)',
                borderRadius: '1.25rem',
                padding: '3rem',
                textAlign: 'center',
                border: '1px solid var(--border)',
                marginBottom: '2rem',
              }}
            >
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                No encontramos productos para tu búsqueda.
              </p>
              <button
                className="nexo-btn-outline"
                onClick={() => {
                  setSelectedCategory('Todas');
                }}
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="nexo-products-grid">
              {articulosFiltrados.map((art) => {
                const meta = getProductCategoryAndSpecs(art);
                const isFav = favoritos.includes(art.codigo);
                const sinStock = Number(art.stock) <= 0;

                return (
                  <div key={art.codigo} className="nexo-product-card">
                    {/* Botón Favorito */}
                    <button
                      className={`nexo-fav-btn ${isFav ? 'active' : ''}`}
                      onClick={() => toggleFavorito(art.codigo)}
                      title="Guardar en favoritos"
                    >
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill={isFav ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>

                    {/* Ilustración del Producto (click abre el detalle en grande) */}
                    <div
                      className="nexo-product-illust"
                      onClick={() => router.push(`/producto/${art.codigo}`)}
                    >
                      <ProductIllustration articulo={art} size={130} />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '0.55rem',
                          left: '0.65rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          background: sinStock ? '#FEE2E2' : '#DCFCE7',
                          color: sinStock ? '#991B1B' : '#166534',
                        }}
                      >
                        {sinStock ? 'Sin stock' : `Stock: ${art.stock}`}
                      </span>
                    </div>

                    {/* Nombre y Subtítulo */}
                    <div
                      className="nexo-product-title"
                      onClick={() => router.push(`/producto/${art.codigo}`)}
                    >
                      {art.nombre}
                    </div>
                    <div className="nexo-product-sub">
                      {meta.subtituloCorto} ·{' '}
                      <span style={{ fontFamily: 'monospace', fontSize: '0.76rem' }}>
                        {art.codigo}
                      </span>
                    </div>

                    {/* Precio y Botón Violeta de Carrito */}
                    <div className="nexo-product-footer">
                      <div className="nexo-product-price">
                        {formatARS(art.precioUnitario)}
                      </div>
                      <button
                        className="nexo-cart-add-btn"
                        disabled={sinStock}
                        title={
                          sinStock
                            ? 'Sin stock disponible'
                            : 'Agregar al carrito'
                        }
                        onClick={() => agregarAlCarrito(art, 1, true)}
                      >
                        <svg
                          width="19"
                          height="19"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="9" cy="21" r="1" />
                          <circle cx="20" cy="21" r="1" />
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 5. Banner Inferior "Ofertas especiales" idéntico al mockup */}
        <section id="ofertas" className="nexo-promo-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '0.85rem',
                background: '#FFFFFF',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '1.12rem', fontWeight: 800 }}>
                Ofertas especiales
              </div>
              <div style={{ fontSize: '0.88rem', color: '#4B5563' }}>
                Hasta 20% OFF en productos seleccionados
              </div>
            </div>
          </div>

          <button
            className="nexo-btn-primary"
            onClick={() => router.push('/ofertas')}
          >
            Ver ofertas
          </button>
        </section>
      </main>
    </div>
  );
}
