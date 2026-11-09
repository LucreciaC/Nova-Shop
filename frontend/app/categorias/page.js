'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import {
  formatARS,
  getProductCategoryAndSpecs,
  ProductIllustration,
} from '../../components/ProductVisuals';
import { useStore } from '../../context/StoreContext';

const CATEGORIAS_DETALLE = [
  {
    id: 'Informática',
    titulo: 'Informática y Computación',
    descripcion: 'Notebooks ultralivianas, monitores QHD y equipamiento para estudio y desarrollo.',
    color: '#EDE9FE',
  },
  {
    id: 'Audio',
    titulo: 'Audio de Alta Fidelidad',
    descripcion: 'Auriculares Bluetooth con cancelación activa de ruido y sonido envolvente.',
    color: '#E0E7FF',
  },
  {
    id: 'Gaming',
    titulo: 'Gaming y Periféricos',
    descripcion: 'Teclados mecánicos RGB Switch Red, mouses ultraligeros y precisión competitiva.',
    color: '#FCE7F3',
  },
  {
    id: 'Hogar',
    titulo: 'Hogar Inteligente (Smart Home)',
    descripcion: 'Parlantes Wi-Fi con asistente de voz e iluminación LED inteligente.',
    color: '#DCFCE7',
  },
  {
    id: 'Accesorios',
    titulo: 'Smartwatches y Accesorios',
    descripcion: 'Relojes inteligentes deportivos, cargadores rápidos GaN y complementos.',
    color: '#FEF3C7',
  },
];

export default function CategoriasPage() {
  const router = useRouter();
  const {
    articulos,
    cargarCatalogo,
    agregarAlCarrito,
    favoritos,
    toggleFavorito,
    selectedCategory,
    setSelectedCategory,
  } = useStore();

  const [catActiva, setCatActiva] = useState(
    selectedCategory && selectedCategory !== 'Todas'
      ? selectedCategory
      : 'Todas',
  );

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const productosEnCategoria = articulos.filter((art) => {
    if (catActiva === 'Todas') return true;
    return getProductCategoryAndSpecs(art).categoria === catActiva;
  });

  return (
    <div>
      <Navbar />

      <main className="nexo-container" style={{ padding: '2.25rem 1.5rem 4rem' }}>
        <div className="nexo-section-title">
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
              Explorá por Categorías
            </h1>
            <p
              style={{
                fontSize: '0.92rem',
                fontWeight: 400,
                color: 'var(--text-muted)',
                marginTop: '0.25rem',
              }}
            >
              Seleccioná una categoría tecnológica para ver sus productos específicos
            </p>
          </div>
          {catActiva !== 'Todas' && (
            <button
              className="nexo-btn-outline"
              onClick={() => setCatActiva('Todas')}
            >
              Ver todas las categorías ({articulos.length})
            </button>
          )}
        </div>

        {/* Grilla de Tarjetas de Categorías */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.15rem',
            marginBottom: '2.5rem',
          }}
        >
          {CATEGORIAS_DETALLE.map((cat) => {
            const items = articulos.filter(
              (a) => getProductCategoryAndSpecs(a).categoria === cat.id,
            );
            const seleccionada = catActiva === cat.id;

            return (
              <div
                key={cat.id}
                onClick={() =>
                  setCatActiva(seleccionada ? 'Todas' : cat.id)
                }
                style={{
                  background: seleccionada ? '#F5F3FF' : 'var(--surface)',
                  border: seleccionada
                    ? '2px solid var(--primary)'
                    : '1px solid #ECEEF5',
                  borderRadius: '1.25rem',
                  padding: '1.35rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: seleccionada
                    ? '0 14px 28px -10px rgba(108, 92, 231, 0.25)'
                    : '0 4px 12px rgba(0,0,0,0.03)',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span
                      style={{
                        background: cat.color,
                        color: 'var(--text)',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        padding: '0.25rem 0.7rem',
                        borderRadius: '9999px',
                      }}
                    >
                      {cat.id}
                    </span>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                      }}
                    >
                      {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.4rem' }}>
                    {cat.titulo}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {cat.descripcion}
                  </p>
                </div>

                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>
                    {seleccionada ? '✓ Categoría seleccionada' : 'Filtrar productos →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Listado de Productos de la Categoría Seleccionada */}
        <div className="nexo-section-title">
          <h2>
            {catActiva === 'Todas'
              ? 'Todos los productos por categoría'
              : `Productos en ${catActiva}`}
          </h2>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Mostrando {productosEnCategoria.length} resultados
          </span>
        </div>

        <div className="nexo-products-grid">
          {productosEnCategoria.map((art) => {
            const meta = getProductCategoryAndSpecs(art);
            const isFav = favoritos.includes(art.codigo);
            const sinStock = Number(art.stock) <= 0;

            return (
              <div key={art.codigo} className="nexo-product-card">
                <button
                  className={`nexo-fav-btn ${isFav ? 'active' : ''}`}
                  onClick={() => toggleFavorito(art.codigo)}
                  title="Favorito"
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
                  <span
                    style={{
                      position: 'absolute',
                      top: '0.6rem',
                      left: '0.6rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '9999px',
                      background: '#EDE9FE',
                      color: 'var(--primary)',
                    }}
                  >
                    {meta.categoria}
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
                  {meta.subtituloCorto} ·{' '}
                  <span style={{ fontFamily: 'monospace', fontSize: '0.76rem' }}>
                    {art.codigo}
                  </span>
                </div>

                <div className="nexo-product-footer">
                  <div className="nexo-product-price">
                    {formatARS(art.precioUnitario)}
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
