'use client';

import { useState } from 'react';

/**
 * Catálogo visual con fotografías reales de alta definición (Unsplash) + fallback SVG
 * para cada producto del catálogo de NOVA Shop.
 */
const PRODUCT_PHOTOS = {
  'A-1001': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=85',
  ],
  'A-1002': [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=85',
  ],
  'A-1003': [
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=85',
  ],
  'A-1004': [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=85',
  ],
  'A-1005': [
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1605773527852-c546a8584ea3?auto=format&fit=crop&w=800&q=85',
  ],
  'A-1006': [
    'https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=85',
  ],
  'A-1007': [
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1547119957-637f8679db1e?auto=format&fit=crop&w=800&q=85',
  ],
  'A-1008': [
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=800&q=85',
  ],
  'A-1009': [
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=85',
  ],
};

const PHOTOS_BY_TYPE = {
  headphones: PRODUCT_PHOTOS['A-1001'],
  laptop: PRODUCT_PHOTOS['A-1002'],
  keyboard: PRODUCT_PHOTOS['A-1003'],
  smartwatch: PRODUCT_PHOTOS['A-1004'],
  mouse: PRODUCT_PHOTOS['A-1005'],
  speaker: PRODUCT_PHOTOS['A-1006'],
};

export function getProductCategoryAndSpecs(articulo) {
  const codigo = (articulo?.codigo || '').toUpperCase();
  const text = `${codigo} ${articulo?.nombre || ''} ${articulo?.descripcion || ''}`.toLowerCase();

  // 1. Audio (A-1001 o palabras clave de audio)
  if (
    codigo === 'A-1001' ||
    text.includes('auricular') ||
    text.includes('audio') ||
    text.includes('headphone')
  ) {
    return {
      categoria: 'Audio',
      subcategoria: 'Auriculares',
      subtituloCorto: 'Cancelación de ruido',
      rating: '4.8',
      reviews: 320,
      enOferta: true,
      descuentoPct: 20,
      precioAnterior: Math.round((Number(articulo?.precioUnitario) || 210000) * 1.25),
      specs: [
        { icon: 'bt', label: 'Bluetooth 5.3' },
        { icon: 'anc', label: 'Cancelación de ruido' },
        { icon: 'bat', label: 'Hasta 40 h de batería' },
      ],
      type: 'headphones',
    };
  }

  // 2. Informática (A-1002, A-1007, notebooks, monitores, cuadernos)
  if (
    codigo === 'A-1002' ||
    codigo === 'A-1007' ||
    text.includes('notebook') ||
    text.includes('monitor') ||
    text.includes('laptop') ||
    text.includes('informática') ||
    text.includes('informatica') ||
    text.includes('cuaderno')
  ) {
    return {
      categoria: 'Informática',
      subcategoria: 'Computación',
      subtituloCorto: text.includes('monitor') ? '27" QHD · 144Hz IPS' : '8GB RAM · 256GB SSD',
      rating: '4.9',
      reviews: 215,
      enOferta: codigo === 'A-1007',
      descuentoPct: codigo === 'A-1007' ? 15 : 0,
      precioAnterior: Math.round((Number(articulo?.precioUnitario) || 420000) * 1.18),
      specs: [
        { icon: 'cpu', label: 'Alto rendimiento profesional y académico' },
        { icon: 'screen', label: 'Panel IPS de alta definición' },
        { icon: 'bat', label: 'Garantía oficial NOVA Shop' },
      ],
      type: 'laptop',
    };
  }

  // 3. Gaming (A-1003, A-1005, teclados, mouses)
  if (
    codigo === 'A-1003' ||
    codigo === 'A-1005' ||
    text.includes('teclado') ||
    text.includes('mouse') ||
    text.includes('gaming')
  ) {
    const isMouse = codigo === 'A-1005' || text.includes('mouse');
    return {
      categoria: 'Gaming',
      subcategoria: isMouse ? 'Mouses' : 'Periféricos',
      subtituloCorto: isMouse ? 'Inalámbrico 16000 DPI' : 'RGB · Switch Red',
      rating: '4.7',
      reviews: 184,
      enOferta: true,
      descuentoPct: 15,
      precioAnterior: Math.round((Number(articulo?.precioUnitario) || 125000) * 1.18),
      specs: isMouse
        ? [
            { icon: 'bt', label: 'Conexión Dual 2.4GHz + Bluetooth' },
            { icon: 'cpu', label: 'Sensor óptico 16.000 DPI' },
            { icon: 'bat', label: 'Hasta 70 h de batería' },
          ]
        : [
            { icon: 'rgb', label: 'Iluminación RGB personalizable' },
            { icon: 'switch', label: 'Switches Mecánicos Red' },
            { icon: 'usb', label: 'Cable USB-C desmontable' },
          ],
      type: isMouse ? 'mouse' : 'keyboard',
    };
  }

  // 4. Hogar (A-1006, A-1008, parlante, lámpara, hogar)
  if (
    codigo === 'A-1006' ||
    codigo === 'A-1008' ||
    text.includes('parlante') ||
    text.includes('lámpara') ||
    text.includes('lampara') ||
    text.includes('hogar')
  ) {
    return {
      categoria: 'Hogar',
      subcategoria: 'Smart Home',
      subtituloCorto: 'Conectividad Wi-Fi Smart',
      rating: '4.7',
      reviews: 128,
      enOferta: codigo === 'A-1008',
      descuentoPct: codigo === 'A-1008' ? 20 : 0,
      precioAnterior: Math.round((Number(articulo?.precioUnitario) || 58000) * 1.25),
      specs: [
        { icon: 'bt', label: 'Wi-Fi Dual Band + Control por App' },
        { icon: 'anc', label: 'Compatible con asistentes de voz' },
        { icon: 'cpu', label: 'Bajo consumo energético' },
      ],
      type: 'speaker',
    };
  }

  // 5. Accesorios (A-1004, A-1009, smartwatch, cargador, mochila, kit, buzo)
  return {
    categoria: 'Accesorios',
    subcategoria: 'Smartwatches y Accesorios',
    subtituloCorto: text.includes('watch') ? 'Salud y deporte' : 'Accesorio Oficial',
    rating: '4.8',
    reviews: 290,
    enOferta: codigo === 'A-1004',
    descuentoPct: codigo === 'A-1004' ? 10 : 0,
    precioAnterior: Math.round((Number(articulo?.precioUnitario) || 189000) * 1.12),
    specs: [
      { icon: 'heart', label: 'Diseño ergonómico y resistente' },
      { icon: 'water', label: 'Materiales de primera calidad' },
      { icon: 'bat', label: 'Disponibilidad inmediata' },
    ],
    type: 'smartwatch',
  };
}

export function formatARS(amount) {
  const num = Number(amount) || 0;
  return '$' + num.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

export function ProductIllustration({ articulo, size = 120, variant = 0 }) {
  const [imgError, setImgError] = useState(false);
  const codigo = (articulo?.codigo || '').toUpperCase();
  const { type } = getProductCategoryAndSpecs(articulo);

  const photosList = PRODUCT_PHOTOS[codigo] || PHOTOS_BY_TYPE[type] || PRODUCT_PHOTOS['A-1001'];
  const photoUrl = photosList[variant % photosList.length];

  if (!imgError && photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={articulo?.nombre || 'Producto NOVA Shop'}
        onError={() => setImgError(true)}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: size <= 64 ? size : '100%',
          maxHeight: size <= 64 ? size : '100%',
          objectFit: 'cover',
          borderRadius: size <= 64 ? '0.5rem' : '0.75rem',
          display: 'block',
        }}
      />
    );
  }

  // Fallback vectorial en caso de estar sin conexión a internet
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <rect x="30" y="30" width="140" height="140" rx="28" fill="#EDE9FE" />
      <circle cx="100" cy="100" r="38" fill="#6C5CE7" />
    </svg>
  );
}
