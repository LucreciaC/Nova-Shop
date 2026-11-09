'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navbar from '../../components/Navbar';
import {
  formatARS,
  getProductCategoryAndSpecs,
  ProductIllustration,
} from '../../components/ProductVisuals';
import { useStore } from '../../context/StoreContext';

export default function OfertasPage() {
  const router = useRouter();
  const {
    articulos,
    cargarCatalogo,
    agregarAlCarrito,
    favoritos,
    toggleFavorito,
  } = useStore();

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const productosEnOferta = articulos.filter(
    (art) => getProductCategoryAndSpecs(art).enOferta,
  );

  return (
    <div>
      <Navbar />

      <main className="nexo-container" style={{ padding: '2rem 1.5rem 4rem' }}>
        {/* Banner Hero de Ofertas Especiales */}
        <section
          style={{
            background:
              'linear-gradient(135deg, #4C1D95 0%, #6C5CE7 55%, #8B7CFF 100%)',
            borderRadius: '1.5rem',
            padding: '2.5rem 2.75rem',
            color: '#FFFFFF',
            marginBottom: '2.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            boxShadow: '0 20px 35px -15px rgba(108, 92, 231, 0.45)',
          }}
        >
          <div>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '0.3rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-block',
                marginBottom: '0.75rem',
              }}
            >
              PROMOCIONES EXCLUSIVAS NEXO STORE
            </span>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.4rem' }}>
              Ofertas especiales de la semana
            </h1>
            <p style={{ fontSize: '1rem', color: '#EDE9FE', maxWidth: 540 }}>
              Hasta 20% OFF en auriculares con cancelación de ruido, periféricos
              gaming, monitores y hogar inteligente.
            </p>
          </div>

          <button
            className="nexo-btn-outline"
            style={{ background: '#FFFFFF', color: 'var(--primary)', border: 'none' }}
            onClick={() => router.push('/categorias')}
          >
            Ver todas las categorías
          </button>
        </section>

        <div className="nexo-section-title">
          <h2>Productos seleccionados con descuento ({productosEnOferta.length})</h2>
        </div>

        <div className="nexo-products-grid">
          {productosEnOferta.map((art) => {
            const meta = getProductCategoryAndSpecs(art);
            const isFav = favoritos.includes(art.codigo);
            const sinStock = Number(art.stock) <= 0;

            return (
              <div key={art.codigo} className="nexo-product-card">
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

                <div
                  className="nexo-product-illust"
                  onClick={() => router.push(`/producto/${art.codigo}`)}
                >
                  <ProductIllustration articulo={art} size={130} />
                  {/* Etiqueta de Descuento % OFF */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '0.65rem',
                      left: '0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      background: '#22C55E',
                      color: '#FFFFFF',
                    }}
                  >
                    -{meta.descuentoPct}% OFF
                  </span>

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

                <div
                  className="nexo-product-title"
                  onClick={() => router.push(`/producto/${art.codigo}`)}
                >
                  {art.nombre}
                </div>
                <div className="nexo-product-sub">
                  {meta.categoria} · {meta.subtituloCorto}
                </div>

                <div className="nexo-product-footer">
                  <div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        textDecoration: 'line-through',
                      }}
                    >
                      {formatARS(meta.precioAnterior)}
                    </div>
                    <div className="nexo-product-price" style={{ color: 'var(--primary)' }}>
                      {formatARS(art.precioUnitario)}
                    </div>
                  </div>

                  <button
                    className="nexo-cart-add-btn"
                    disabled={sinStock}
                    onClick={() => agregarAlCarrito(art, 1, true)}
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
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
