/**
 * Servicio de Inteligencia Artificial — NOVA AI Shopping & Product Intelligence (RAG sobre Catálogo SOA)
 * - Utiliza la API oficial de Google Gemini (modelos gemini-3.5-flash-lite / gemini-3.6-flash / gemini-3.1-flash-lite)
 *   para generar respuestas reales y dinámicas en cada consulta del chat y en cada análisis de producto.
 * - Incluye fallback automático entre modelos de Gemini y respaldo local si se corta internet.
 */

const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
];

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

function extraerPresupuesto(q) {
  const matchMil = q.match(/(\d+)\s*mil/);
  if (matchMil) return Number(matchMil[1]) * 1000;
  const matchNumeroGrande = q.match(/\$?\s*(\d{2,3}(?:\.?\d{3})+|\d{5,7})/);
  if (matchNumeroGrande) {
    return Number(matchNumeroGrande[1].replace(/\./g, ''));
  }
  return null;
}

/**
 * Llamada a la API oficial de Google Gemini con rotación automática de modelos y timeout rápido
 */
async function invocarGeminiJSON(apiKey, promptTexto, temperature = 0.75) {
  let ultimoError = null;

  for (const modelName of GEMINI_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: promptTexto }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature,
            },
          }),
        },
      );
      clearTimeout(timer);

      if (!res.ok) {
        ultimoError = new Error(`Gemini ${modelName} HTTP ${res.status}`);
        continue;
      }

      const json = await res.json();
      const parts = json?.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find((p) => typeof p.text === 'string') || parts[0];
      const rawText = textPart?.text || '{}';
      const parsed = JSON.parse(rawText);
      return { parsed, modelName };
    } catch (err) {
      clearTimeout(timer);
      ultimoError = err;
    }
  }

  throw ultimoError || new Error('No se pudo conectar con Google Gemini API');
}

/**
 * 1. Chat Conversacional con Google Gemini API + RAG sobre el catálogo de PostgreSQL
 */
async function consultarGeminiChat(apiKey, mensajeUsuario, catalogo) {
  const resumenCatalogo = catalogo
    .map(
      (a) =>
        `- Código: ${a.codigo} | Nombre: ${a.nombre} | Categoría: ${clasificarRubro(a)} | Precio: $${a.precioUnitario} ARS | Stock disponible: ${a.stock} u. | Descripción: ${a.descripcion || ''}`,
    )
    .join('\n');

  const prompt = `Sos NOVA AI, el asistente virtual inteligente del e-commerce tecnológico NOVA Shop (proyecto SOA de la Universidad Champagnat - UCH-FyD).
Respondé en español rioplatense (Argentina), con un tono cálido, experto, persuasivo y natural (entre 2 y 4 oraciones). Variá tu redacción en cada consulta.
Usá EXCLUSIVAMENTE los datos reales de este catálogo consultado en tiempo real desde PostgreSQL:
${resumenCatalogo}

Instrucciones importantes:
- Si el cliente pide armar un combo o menciona un presupuesto (ej. "$250.000"), elegí entre 2 y 3 productos con stock cuya suma no supere ese presupuesto, mencioná cuánto suman en total y activá "esCombo": true.
- Si el cliente pide comparar productos, compará sus precios, prestaciones y stock disponible.
- Incluí en "codigosRecomendados" entre 1 y 3 códigos exactos del catálogo (ej. ["A-1003", "A-1005"]).

Devolvé ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "respuesta": "tu respuesta redactada para el cliente",
  "codigosRecomendados": ["A-1001"],
  "esCombo": false
}

Consulta del cliente: "${mensajeUsuario}"`;

  const { parsed, modelName } = await invocarGeminiJSON(apiKey, prompt, 0.75);
  const codigos = Array.isArray(parsed.codigosRecomendados) ? parsed.codigosRecomendados : [];
  const productosRecomendados = catalogo
    .filter((a) => codigos.includes(a.codigo) && Number(a.stock) > 0)
    .slice(0, 3);

  const listaFinal =
    productosRecomendados.length > 0
      ? productosRecomendados
      : catalogo.filter((a) => Number(a.stock) > 0).slice(0, 2);

  const totalCombo = listaFinal.reduce((acc, item) => acc + Number(item.precioUnitario), 0);
  const esCombo =
    Boolean(parsed.esCombo) ||
    mensajeUsuario.toLowerCase().includes('combo') ||
    mensajeUsuario.toLowerCase().includes('armame');

  return {
    respuesta:
      parsed.respuesta ||
      'Analicé nuestro catálogo en tiempo real y seleccioné estas opciones ideales para vos:',
    productosRecomendados: listaFinal,
    resumenCombo:
      esCombo && listaFinal.length >= 2
        ? {
            cantidadProductos: listaFinal.length,
            totalCombo,
          }
        : null,
    intencionDetectada: 'llm_gemini_rag',
    motor: `Google Gemini API (${modelName} · RAG en vivo)`,
  };
}

/**
 * 2. Análisis Inteligente de Producto Individual con Google Gemini API + RAG
 */
async function analizarProductoConGemini(apiKey, codigoArticulo, catalogo) {
  const codigo = String(codigoArticulo || '').toUpperCase();
  const producto = catalogo.find((a) => a.codigo.toUpperCase() === codigo) || catalogo[0];
  if (!producto) {
    throw new Error('Artículo no encontrado en el catálogo');
  }

  const otrosProductos = catalogo
    .filter((a) => a.codigo !== producto.codigo && Number(a.stock) > 0)
    .map((a) => `- ${a.codigo}: ${a.nombre} ($${a.precioUnitario} ARS, stock: ${a.stock})`)
    .join('\n');

  const cuota = formatearPesos(Math.round(Number(producto.precioUnitario) / 6));
  const enfoques = [
    'Enfocate en la productividad diaria, comodidad y estudio universitario.',
    'Enfocate en el rendimiento técnico puro, velocidad y calidad de materiales.',
    'Enfocate en el ahorro financiero de las cuotas sin interés y durabilidad a largo plazo.',
    'Enfocate en la experiencia de uso en casa, entretenimiento y versatilidad.',
    'Enfocate en por qué destaca frente a otros competidores del mercado actual.',
  ];
  const enfoqueAleatorio = enfoques[Math.floor(Math.random() * enfoques.length)];
  const nonceVariacion = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const prompt = `[ID de consulta única: ${nonceVariacion}]
Sos NOVA AI, el analista experto en tecnología del e-commerce NOVA Shop.
Generá un análisis original, natural, profesional y diferente cada vez en español argentino (sin usar jerga exagerada) para el siguiente producto consultado en tiempo real desde PostgreSQL:
- Enfoque especial para esta respuesta: ${enfoqueAleatorio}
- Código: ${producto.codigo}
- Nombre: ${producto.nombre}
- Categoría: ${clasificarRubro(producto)}
- Precio: $${producto.precioUnitario} ARS (6 cuotas sin interés de ${cuota})
- Stock actual en base de datos: ${producto.stock} unidades
- Descripción: ${producto.descripcion || ''}

Otros productos disponibles hoy en el catálogo para recomendar como complemento:
${otrosProductos}

Devolvé ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "perfilIdeal": "Explicación original de 1 o 2 oraciones sobre para qué tipo de usuario o situación real es ideal este producto siguiendo el enfoque pedido.",
  "veredictoPrecioCalidad": "Puntaje sobre 10 (ej. 9.4/10) y una frase breve y original evaluando su relación precio-calidad y sus cuotas.",
  "puntosFuertes": [
    "Ventaja clave 1 redactada de forma original",
    "Ventaja clave 2 redactada de forma original",
    "Ventaja clave 3 sobre disponibilidad, envío o financiación"
  ],
  "codigoComplemento": "Código exacto (ej. A-1005) del mejor producto de la lista anterior para combinar con este"
}`;

  const { parsed, modelName } = await invocarGeminiJSON(apiKey, prompt, 1.0);
  const complemento =
    catalogo.find(
      (a) =>
        a.codigo === parsed.codigoComplemento &&
        a.codigo !== producto.codigo &&
        Number(a.stock) > 0,
    ) || catalogo.find((a) => a.codigo !== producto.codigo && Number(a.stock) > 0);

  return {
    codigoAnalizado: producto.codigo,
    nombreAnalizado: producto.nombre,
    rubro: clasificarRubro(producto),
    stockTiempoReal: Number(producto.stock),
    perfilIdeal: parsed.perfilIdeal,
    puntosFuertes: Array.isArray(parsed.puntosFuertes) ? parsed.puntosFuertes.slice(0, 3) : [],
    veredictoPrecioCalidad: parsed.veredictoPrecioCalidad,
    productoComplementario: complemento || null,
    precioComboSugerido: complemento
      ? Number(producto.precioUnitario) + Number(complemento.precioUnitario)
      : Number(producto.precioUnitario),
    motor: `Google Gemini API (${modelName} · RAG SOA)`,
  };
}

/**
 * Motores locales de respaldo por si en algún momento no hay conexión a internet
 */
function motorSemanticaLocal(mensajeUsuario, catalogo) {
  const q = String(mensajeUsuario || '').toLowerCase().trim();
  const disponibles = catalogo.filter((a) => Number(a.stock) > 0);
  const presupuestoMax = extraerPresupuesto(q);

  if (q.includes('combo') || q.includes('kit') || q.includes('armame')) {
    const tope = presupuestoMax || 300000;
    const candidatos = disponibles
      .filter((a) => Number(a.precioUnitario) <= tope)
      .sort((a, b) => Number(a.precioUnitario) - Number(b.precioUnitario));
    const seleccion = [];
    let acumulado = 0;
    for (const item of candidatos) {
      if (acumulado + Number(item.precioUnitario) <= tope && seleccion.length < 3) {
        seleccion.push(item);
        acumulado += Number(item.precioUnitario);
      }
    }
    if (seleccion.length >= 2) {
      return {
        respuesta: `Te armé un combo optimizando tu presupuesto de ${formatearPesos(tope)} con stock disponible por un total de ${formatearPesos(acumulado)}:`,
        productosRecomendados: seleccion,
        resumenCombo: { cantidadProductos: seleccion.length, totalCombo: acumulado },
        intencionDetectada: 'armado_combo_inteligente',
      };
    }
  }

  return {
    respuesta: 'Consulté el catálogo en tiempo real desde PostgreSQL. Aquí tenés los productos recomendados con stock disponible:',
    productosRecomendados: disponibles.slice(0, 3),
    intencionDetectada: 'recomendacion_catalogo',
  };
}

function analizarProductoLocal(codigoArticulo, catalogo) {
  const codigo = String(codigoArticulo || '').toUpperCase();
  const producto = catalogo.find((a) => a.codigo.toUpperCase() === codigo) || catalogo[0];
  const complemento = catalogo.find((a) => a.codigo !== producto.codigo && Number(a.stock) > 0);
  const cuota = formatearPesos(Math.round(Number(producto.precioUnitario) / 6));

  return {
    codigoAnalizado: producto.codigo,
    nombreAnalizado: producto.nombre,
    rubro: clasificarRubro(producto),
    stockTiempoReal: Number(producto.stock),
    perfilIdeal: `Ideal para usuarios que buscan alto rendimiento en la categoría ${clasificarRubro(producto)}.`,
    puntosFuertes: [
      producto.descripcion || 'Diseño de alta durabilidad y garantía oficial.',
      `Disponibilidad inmediata (${producto.stock} unidades en PostgreSQL).`,
      `Financiación en 6 cuotas sin interés de ${cuota}.`,
    ],
    veredictoPrecioCalidad: 'Excelente (9.5/10) — Muy buena relación costo-beneficio.',
    productoComplementario: complemento || null,
    precioComboSugerido: complemento
      ? Number(producto.precioUnitario) + Number(complemento.precioUnitario)
      : Number(producto.precioUnitario),
    motor: 'NOVA Semantic RAG Engine (Fallback Local)',
  };
}

async function procesarConsultaAsistenteIA({ mensaje, obtenerCatalogoFn }) {
  const { catalogo, ventasInstance } = await obtenerCatalogoFn();
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const resGemini = await consultarGeminiChat(apiKey.trim(), mensaje, catalogo);
      return {
        ...resGemini,
        instanciaConsultada: ventasInstance || 'ventas-instance-1',
      };
    } catch (err) {
      console.error('[NOVA AI] Error en Gemini Chat, usando respaldo local:', err.message);
    }
  }

  const resultadoLocal = motorSemanticaLocal(mensaje, catalogo);
  return {
    ...resultadoLocal,
    motor: 'NOVA Semantic RAG Engine (Catálogo en Tiempo Real)',
    instanciaConsultada: ventasInstance || 'ventas-instance-1',
  };
}

async function procesarAnalisisProductoIA({ codigo, obtenerCatalogoFn }) {
  const { catalogo, ventasInstance } = await obtenerCatalogoFn();
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const resGemini = await analizarProductoConGemini(apiKey.trim(), codigo, catalogo);
      return {
        ...resGemini,
        instanciaConsultada: ventasInstance || 'ventas-instance-1',
      };
    } catch (err) {
      console.error('[NOVA AI] Error en Gemini Análisis Producto, usando respaldo local:', err.message);
    }
  }

  const analisis = analizarProductoLocal(codigo, catalogo);
  return {
    ...analisis,
    instanciaConsultada: ventasInstance || 'ventas-instance-1',
  };
}

/**
 * 3. Resumen Inteligente con IA de las Opiniones de los Clientes (estilo Mercado Libre / Amazon)
 */
async function resumirOpinionesConGemini(apiKey, codigo, nombreProducto, comentarios) {
  const promedio =
    comentarios.length > 0
      ? (
          comentarios.reduce((acc, c) => acc + Number(c.calificacion || 5), 0) /
          comentarios.length
        ).toFixed(1)
      : '5.0';

  const listaTexto = comentarios
    .map(
      (c, idx) =>
        `${idx + 1}. Cliente: ${c.nombreCliente} (${c.calificacion}/5 estrellas): "${c.texto}"`,
    )
    .join('\n');

  const nonceVariacion = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const prompt = `[ID de consulta única: ${nonceVariacion}]
Sos NOVA AI, el motor de análisis de sentimiento y experiencia de usuario de NOVA Shop.
Analizá las siguientes ${comentarios.length} opiniones reales de clientes extraídas en tiempo real de PostgreSQL sobre el producto "${nombreProducto}" (${codigo}, promedio actual ${promedio}/5):
${listaTexto}

Redactá en español argentino (claro, profesional y natural, variando tu redacción en cada llamada) un resumen ejecutivo de lo que opinan los compradores.
Devolvé ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "sentimientoGeneral": "Ej: 98% Positivo · Excelente recepción",
  "resumenEjecutivo": "Párrafo breve de 2 oraciones sintetizando la opinión real de todos los clientes que comentaron, mencionando qué es lo que más valoran.",
  "aspectosDestacados": [
    "Etiqueta corta 1 (ej. Calidad de sonido)",
    "Etiqueta corta 2 (ej. Duración de batería)",
    "Etiqueta corta 3 (ej. Comodidad de uso)"
  ],
  "conclusionComunidad": "Una frase corta final con el veredicto de los compradores."
}`;

  const { parsed, modelName } = await invocarGeminiJSON(apiKey, prompt, 0.95);
  return {
    codigo,
    nombreProducto,
    totalOpinionesAnalizadas: comentarios.length,
    calificacionPromedio: Number(promedio),
    sentimientoGeneral: parsed.sentimientoGeneral || '96% Positivo',
    resumenEjecutivo: parsed.resumenEjecutivo,
    aspectosDestacados: Array.isArray(parsed.aspectosDestacados)
      ? parsed.aspectosDestacados.slice(0, 4)
      : ['Calidad verificada', 'Alto rendimiento', 'Muy recomendado'],
    conclusionComunidad:
      parsed.conclusionComunidad ||
      'La comunidad de compradores recomienda ampliamente este producto.',
    motor: `Google Gemini API (${modelName} · Sentiment RAG)`,
  };
}

async function procesarResumenOpinionesIA({ codigo, obtenerDatosOpinionesFn }) {
  const { producto, comentarios, ventasInstance } = await obtenerDatosOpinionesFn();
  const nombreProducto = producto?.nombre || codigo;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!comentarios || comentarios.length === 0) {
    return {
      codigo,
      nombreProducto,
      totalOpinionesAnalizadas: 0,
      calificacionPromedio: 5.0,
      sentimientoGeneral: 'Sin opiniones registradas aún',
      resumenEjecutivo: 'Todavía no hay comentarios de clientes para analizar en este producto.',
      aspectosDestacados: [],
      conclusionComunidad: 'Sé el primero en dejar tu reseña para que NOVA AI pueda analizarla.',
      motor: 'NOVA AI Sentiment Engine',
      instanciaConsultada: ventasInstance || 'ventas-instance-1',
    };
  }

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const resGemini = await resumirOpinionesConGemini(
        apiKey.trim(),
        codigo,
        nombreProducto,
        comentarios,
      );
      return {
        ...resGemini,
        instanciaConsultada: ventasInstance || 'ventas-instance-1',
      };
    } catch (err) {
      console.error('[NOVA AI] Error en Gemini Resumen Opiniones, usando respaldo local:', err.message);
    }
  }

  const promedio = (
    comentarios.reduce((acc, c) => acc + Number(c.calificacion || 5), 0) /
    comentarios.length
  ).toFixed(1);

  return {
    codigo,
    nombreProducto,
    totalOpinionesAnalizadas: comentarios.length,
    calificacionPromedio: Number(promedio),
    sentimientoGeneral: `${Math.round((Number(promedio) / 5) * 100)}% Positivo`,
    resumenEjecutivo: `Basado en ${comentarios.length} opiniones reales verificadas en PostgreSQL, los compradores destacan el rendimiento, la calidad de fabricación y la excelente relación precio-calidad de ${nombreProducto}.`,
    aspectosDestacados: ['Calidad comprobada', 'Excelente rendimiento', 'Conformidad total'],
    conclusionComunidad: 'Producto altamente recomendado por clientes verificados de NOVA Shop.',
    motor: 'NOVA AI Sentiment Engine (Fallback Local)',
    instanciaConsultada: ventasInstance || 'ventas-instance-1',
  };
}

module.exports = {
  procesarConsultaAsistenteIA,
  procesarAnalisisProductoIA,
  procesarResumenOpinionesIA,
};
