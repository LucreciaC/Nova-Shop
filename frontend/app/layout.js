import './globals.css';
import Footer from '../components/Footer';
import { StoreProvider } from '../context/StoreContext';

export const metadata = {
  title: 'NOVA Shop — Tecnología que te conecta',
  description: 'Tienda oficial de tecnología y equipamiento de alto rendimiento',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <StoreProvider>
          <div style={{ flex: 1 }}>{children}</div>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
