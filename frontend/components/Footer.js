'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="nexo-footer">
      <div className="nexo-container">
        <div className="nexo-footer-grid">
          {/* Columna 1: Marca */}
          <div>
            <Link href="/" className="nexo-logo" style={{ color: '#FFFFFF', marginBottom: '0.85rem' }}>
              NOVA <span>Shop</span>
            </Link>
            <p style={{ fontSize: '0.88rem', color: '#9CA3AF', maxWidth: 320, lineHeight: 1.6 }}>
              Tu tienda oficial de tecnología de alta gama. Productos originales con garantía oficial,
              stock en tiempo real y asistencia inteligente por IA.
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.15rem', flexWrap: 'wrap' }}>
              <span className="nexo-footer-pill">Pagos 100% Protegidos</span>
              <span className="nexo-footer-pill">Asistente NOVA AI</span>
            </div>
          </div>

          {/* Columna 2: Tienda */}
          <div>
            <h4 className="nexo-footer-heading">Tienda</h4>
            <ul className="nexo-footer-links">
              <li><Link href="/">Inicio</Link></li>
              <li><Link href="/#catalogo">Catálogo completo</Link></li>
              <li><Link href="/categorias">Categorías tecnológicas</Link></li>
              <li><Link href="/ofertas">Ofertas de la semana</Link></li>
            </ul>
          </div>

          {/* Columna 3: Mi Cuenta */}
          <div>
            <h4 className="nexo-footer-heading">Mi Cuenta</h4>
            <ul className="nexo-footer-links">
              <li><Link href="/login">Iniciar sesión / Registrarse</Link></li>
              <li><Link href="/pedidos">Mis compras y comprobantes</Link></li>
            </ul>
          </div>

          {/* Columna 4: Atención y Contacto */}
          <div>
            <h4 className="nexo-footer-heading">Atención al Cliente</h4>
            <ul className="nexo-footer-links" style={{ color: '#9CA3AF' }}>
              <li>Mendoza, Argentina · UCH-FyD</li>
              <li>Lunes a Viernes de 9:00 a 20:00 hs</li>
              <li>Asistente virtual NOVA AI 24/7</li>
              <li>Envíos express a todo el país</li>
            </ul>
          </div>
        </div>

        <div className="nexo-footer-bottom">
          <span>© {new Date().getFullYear()} NOVA Shop · Todos los derechos reservados.</span>
          <span>Universidad Champagnat — Facultad de Informática y Diseño</span>
        </div>
      </div>
    </footer>
  );
}
