'use client';

/**
 * Ilustraciones vectoriales de alta resolución estilo e-commerce moderno (NEXO Store)
 * Detecta el tipo de producto por su código o nombre y renderiza el gráfico correspondiente.
 */
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
        { icon: 'bat', label: 'Garantía oficial UCH-FyD' },
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
  const { type } = getProductCategoryAndSpecs(articulo);

  if (type === 'headphones') {
    const angle = variant === 1 ? 'rotate(-12 100 100)' : variant === 2 ? 'scale(0.88)' : '';
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <defs>
          <linearGradient id="hpBand" x1="30" y1="20" x2="170" y2="180" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4F46E5" />
            <stop offset="0.5" stopColor="#312E81" />
            <stop offset="1" stopColor="#1E1B4B" />
          </linearGradient>
          <linearGradient id="hpCup" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#6C5CE7" />
            <stop offset="1" stopColor="#2E266D" />
          </linearGradient>
        </defs>
        <g transform={angle} style={{ transformOrigin: 'center' }}>
          <path
            d="M45 112C45 64 69 32 100 32C131 32 155 64 155 112"
            stroke="url(#hpBand)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <rect x="30" y="96" width="32" height="58" rx="16" fill="url(#hpCup)" />
          <rect x="44" y="102" width="14" height="46" rx="7" fill="#1F2937" />
          <rect x="138" y="96" width="32" height="58" rx="16" fill="url(#hpCup)" />
          <rect x="142" y="102" width="14" height="46" rx="7" fill="#1F2937" />
          <circle cx="154" cy="125" r="7" fill="#8B7CFF" fillOpacity="0.4" />
        </g>
      </svg>
    );
  }

  if (type === 'laptop') {
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <defs>
          <linearGradient id="lapScreen" x1="35" y1="45" x2="165" y2="135" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B7CFF" />
            <stop offset="0.5" stopColor="#6C5CE7" />
            <stop offset="1" stopColor="#1E1B4B" />
          </linearGradient>
        </defs>
        <rect x="36" y="46" width="128" height="84" rx="8" fill="#1F2937" stroke="#374151" strokeWidth="4" />
        <rect x="42" y="52" width="116" height="72" rx="4" fill="url(#lapScreen)" />
        <path d="M42 110L95 72L158 105V124H42V110Z" fill="#A5B4FC" fillOpacity="0.35" />
        <path d="M20 132H180L168 146H32L20 132Z" fill="#9CA3AF" />
        <rect x="82" y="132" width="36" height="4" rx="2" fill="#4B5563" />
      </svg>
    );
  }

  if (type === 'keyboard') {
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <rect x="22" y="68" width="156" height="68" rx="10" fill="#1F2937" stroke="#4F46E5" strokeWidth="3" />
        <rect x="28" y="126" width="144" height="4" rx="2" fill="#EC4899" />
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3, 4, 5, 6, 7, 8].map((col) => (
            <rect
              key={`${row}-${col}`}
              x={32 + col * 15}
              y={76 + row * 14}
              width="11"
              height="10"
              rx="2"
              fill={col % 3 === 0 ? '#6C5CE7' : col % 2 === 0 ? '#374151' : '#8B7CFF'}
            />
          )),
        )}
        <rect x="62" y="118" width="76" height="7" rx="2" fill="#6C5CE7" />
      </svg>
    );
  }

  if (type === 'smartwatch') {
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <path d="M78 30H122L126 62H74L78 30Z" fill="#374151" />
        <path d="M74 138H126L122 170H78L74 138Z" fill="#374151" />
        <rect x="62" y="56" width="76" height="88" rx="20" fill="#111827" stroke="#6B7280" strokeWidth="4" />
        <rect x="69" y="63" width="62" height="74" rx="14" fill="#1E1B4B" />
        <circle cx="100" cy="94" r="18" stroke="#22C55E" strokeWidth="4" />
        <path d="M100 84V94L107 99" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        <rect x="82" y="121" width="36" height="6" rx="3" fill="#6C5CE7" />
      </svg>
    );
  }

  if (type === 'mouse') {
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <rect x="66" y="40" width="68" height="120" rx="34" fill="#1F2937" stroke="#6C5CE7" strokeWidth="4" />
        <line x1="100" y1="42" x2="100" y2="85" stroke="#4B5563" strokeWidth="3" />
        <rect x="95" y="56" width="10" height="20" rx="5" fill="#8B7CFF" />
        <path d="M76 135C86 146 114 146 124 135" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <rect x="52" y="44" width="96" height="112" rx="24" fill="#312E81" stroke="#8B7CFF" strokeWidth="4" />
      <circle cx="100" cy="112" r="26" fill="#1E1B4B" stroke="#6C5CE7" strokeWidth="4" />
      <circle cx="100" cy="112" r="10" fill="#8B7CFF" />
      <circle cx="100" cy="66" r="8" fill="#22C55E" />
    </svg>
  );
}
