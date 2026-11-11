/**
 * Servicio de Inteligencia Artificial — NOVA AI Shopping Assistant (RAG sobre Catálogo SOA)
 * - Consulta en tiempo real el catálogo de artículos del Servidor de Ventas a través del Circuit Breaker.
 * - Si está definida la variable GEMINI_API_KEY, utiliza Google Gemini 2.5 Flash con el contexto real de stock y precios.
 * - Si no hay clave configurada o no hay internet durante la exposición, ejecuta el motor de inferencia semántica local
 *   con análisis de intenciones (presupuesto, categorías, ofertas, comparaciones, disponibilidad de stock).
 */

function clasificarRubro(art) {
  const txt = `${art.codigo} ${art.nombre} ${art.descripcion || ''}`.toLowerCase();
  if (txt.includes('auricular') || txt.includes('sonido') || txt.includes('audio')) return 'Audio';
  if (txt.includes('teclado') || txt.includes('mouse') || txt.includes('gaming') || txt.includes('rgb')) return 'Gaming';
  if (txt.includes('parlante') || txt.includes('lámpara') || txt.includes('lampara') || txt.includes('hogar') || txt.includes('wifi')) return 'Hogar';
  if (txt.includes('reloj') || txt.includes('smartwatch') || txt.includes('cargador') || txt.includes('usb')) return 'Accesorios';
  return 'Informática';
}

function formatearPesos(valor) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));
}

function motorSemanticaLocal(mensajeUsuario, catalogo) {
  const q = String(mensajeUsuario || '').toLowerCase().trim();
  const disponibles = catalogo.filter((a) => Number(a.stock) > 0);

  // 1. Detectar si el usuario menciona un presupuesto máximo (ej. "menos de 150000", "150 mil", "$200.000", "barato", "económico")
  let presupuestoMax = null;
  const matchMil = q.match(/(\d+)\s*mil/);
  const matchNumeroGrande = q.match(/\$?\s*(\d{2,3}(?:\.?\d{3})+|\d{5,7})/);
  if (matchMil) {
    presupuestoMax = Number(matchMil[1]) * 1000;
  } else if (matchNumeroGrande) {
    presupuestoMax = Number(matchNumeroGrande[1].replace(/\./g, ''));
  }

  // 2. Detectar intención de económicos / más baratos
  if (q.includes('barat') || q.includes('econom') || q.includes('económ') || q.includes('accesible') || presupuestoMax) {
    const tope = presupuestoMax || 150000;
    const filtrados = disponibles
      .filter((a) => Number(a.precioUnitario) <= tope)
      .sort((a, b) => Number(a.precioUnitario) - Number(b.precioUnitario));

    const recomendados = (filtrados.length > 0 ? filtrados : disponibles.slice().sort((a, b) => a.precioUnitario - b.precioUnitario)).slice(0, 3);
    const listaTexto = recomendados
      .map((a) => `• **${a.nombre}** (${a.codigo}): **${formatearPesos(a.precioUnitario)}** (${a.stock} u. en stock)`)
      .join('\n');

    return {
      respuesta: presupuestoMax
        ? `Analicé el catálogo en tiempo real buscando opciones con stock por debajo de **${formatearPesos(presupuestoMax)}**. Te recomiendo estas alternativas:`
        : `Busqué en nuestro catálogo las opciones más económicas con stock inmediato disponible:\n\n${listaTexto}`,
      productosRecomendados: recomendados,
      intencionDetectada: 'busqueda_por_presupuesto',
    };
  }

  // 3. Detectar intención por categoría o tipo de uso (Gaming / Jugar)
  if (q.includes('jugar') || q.includes('juego') || q.includes('gamer') || q.includes('gaming') || q.includes('teclado') || q.includes('mouse')) {
    const recomendados = disponibles.filter((a) => clasificarRubro(a) === 'Gaming' || a.nombre.toLowerCase().includes('monitor'));
    return {
      respuesta:
        '¡Excelente elección! Para **Gaming y eSports** consulté el stock en el Servidor de Ventas y te recomiendo nuestro combo de baja latencia y alta tasa de refresco:',
      productosRecomendados: recomendados.slice(0, 3),
      intencionDetectada: 'recomendacion_gaming',
    };
  }

  // 4. Detectar intención de estudio / trabajo / programación / informática / notebook
  if (q.includes('estudi') || q.includes('trabaj') || q.includes('facultad') || q.includes('program') || q.includes('notebook') || q.includes('comput') || q.includes('informática') || q.includes('informatica') || q.includes('monitor')) {
    const recomendados = disponibles.filter((a) => clasificarRubro(a) === 'Informática');
    return {
      respuesta:
        'Para **estudio universitario, programación o trabajo remoto**, estas son las mejores herramientas de la categoría **Informática** con stock disponible hoy:',
      productosRecomendados: recomendados.slice(0, 3),
      intencionDetectada: 'recomendacion_informatica',
    };
  }

  // 5. Detectar intención de música / audio / auriculares
  if (q.includes('auricular') || q.includes('música') || q.includes('musica') || q.includes('sonido') || q.includes('audio') || q.includes('ruido')) {
    const recomendados = disponibles.filter(
      (a) => clasificarRubro(a) === 'Audio' || a.nombre.toLowerCase().includes('parlante'),
    );
    return {
      respuesta:
        'Si buscás calidad de sonido y cancelación activa de ruido, te sugiero estos productos de **Audio y Sonido** verificados en nuestro inventario:',
      productosRecomendados: recomendados.slice(0, 3),
      intencionDetectada: 'recomendacion_audio',
    };
  }

  // 6. Detectar intención de hogar inteligente / casa / regalo
  if (q.includes('hogar') || q.includes('casa') || q.includes('regalo') || q.includes('reloj') || q.includes('smartwatch') || q.includes('cargador')) {
    const recomendados = disponibles.filter((a) => ['Hogar', 'Accesorios'].includes(clasificarRubro(a)));
    return {
      respuesta:
        'Para un **regalo tecnológico o equipar el hogar inteligente**, estos artículos son los más elegidos de NOVA Shop y cuentan con entrega inmediata:',
      productosRecomendados: recomendados.slice(0, 3),
      intencionDetectada: 'recomendacion_hogar_accesorios',
    };
  }

  // 7. Detectar consulta sobre stock general o catálogo completo
  if (q.includes('stock') || q.includes('disponible') || q.includes('tienen') || q.includes('catálogo') || q.includes('catalogo')) {
    const totalUnidades = disponibles.reduce((acc, a) => acc + Number(a.stock), 0);
    return {
      respuesta: `En este instante tenemos **${disponibles.length} productos activos** en PostgreSQL sumando **${totalUnidades} unidades totales en stock**. Aquí tenés los destacados:`,
      productosRecomendados: disponibles.slice(0, 3),
      intencionDetectada: 'consulta_stock_tiempo_real',
    };
  }

  // 8. Búsqueda directa por coincidencia de palabras clave en nombre o descripción
  const palabras = q.split(/\s+/).filter((w) => w.length >= 3);
  const coincidencias = disponibles.filter((a) => {
    const blob = `${a.codigo} ${a.nombre} ${a.descripcion || ''}`.toLowerCase();
    return palabras.some((p) => blob.includes(p));
  });

  if (coincidencias.length > 0) {
    return {
      respuesta: `Encontré **${coincidencias.length} ${coincidencias.length === 1 ? 'producto' : 'productos'}** en nuestro catálogo que coinciden con tu consulta:`,
      productosRecomendados: coincidencias.slice(0, 3),
      intencionDetectada: 'busqueda_semantica_directa',
    };
  }

  // 9. Respuesta amigable por defecto con los destacados
  return {
    respuesta:
      '¡Hola! Soy **NOVA AI**, tu asistente inteligente conectado en tiempo real al **Servidor de Ventas SOA**. Puedo recomendarte productos por presupuesto (ej. *"algo por menos de $150.000"*), para *gaming*, *estudio*, *audio* o verificar el stock actual. Mirá nuestros destacados de hoy:',
    productosRecomendados: disponibles.slice(0, 3),
    intencionDetectada: 'saludo_y_destacados',
  };
}

async function consultarGeminiLLM(apiKey, mensajeUsuario, catalogo) {
  const resumenCatalogo = catalogo
    .map(
      (a) =>
        `- Código: ${a.codigo} | Nombre: ${a.nombre} | Precio: $${a.precioUnitario} ARS | Stock: ${a.stock} u. | Detalle: ${a.descripcion || ''}`,
    )
    .join('\n');

  const promptSistema = `Sos NOVA AI, el asistente virtual inteligente del e-commerce NOVA Shop (Arquitectura de Sistemas UCH-FyD).
Respondé en español rioplatense (Argentina), de forma breve (máximo 3 oraciones), amable y útil, basándote EXCLUSIVAMENTE en el siguiente catálogo real en tiempo real obtenido del Servidor de Ventas:
${resumenCatalogo}

Devolvé tu respuesta en formato JSON estricto con esta estructura:
{
  "respuesta": "texto breve para el cliente",
  "codigosRecomendados": ["A-1001", "A-1003"]
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${promptSistema}\n\nConsulta del cliente: ${mensajeUsuario}` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini API HTTP ${res.status}`);
  }

  const json = await res.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const parsed = JSON.parse(rawText);
  const codigos = Array.isArray(parsed.codigosRecomendados) ? parsed.codigosRecomendados : [];
  const productosRecomendados = catalogo.filter((a) => codigos.includes(a.codigo)).slice(0, 3);

  return {
    respuesta: parsed.respuesta || 'Aquí tenés mis recomendaciones basadas en nuestro catálogo actual:',
    productosRecomendados:
      productosRecomendados.length > 0 ? productosRecomendados : catalogo.slice(0, 2),
    intencionDetectada: 'llm_gemini_rag',
    motor: 'Google Gemini 2.5 Flash (RAG)',
  };
}

async function procesarConsultaAsistenteIA({ mensaje, obtenerCatalogoFn }) {
  const catalogo = await obtenerCatalogoFn();
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 10) {
    try {
      return await consultarGeminiLLM(apiKey.trim(), mensaje, catalogo);
    } catch (_) {
      // Fallback transparente al motor semántico local si no hay internet o falla la API externa
    }
  }

  const resultadoLocal = motorSemanticaLocal(mensaje, catalogo);
  return {
    ...resultadoLocal,
    motor: 'NOVA Semantic RAG Engine (Catálogo en Tiempo Real)',
  };
}

module.exports = {
  procesarConsultaAsistenteIA,
};
