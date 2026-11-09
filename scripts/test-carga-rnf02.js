/**
 * Script de Prueba de Carga y Escalabilidad (RNF-02, RNF-08, DRV-02, ADR-01 - Páginas 11, 18 y 39 del documento)
 *
 * Escenario del documento:
 * - Incremento del 50 % de usuarios concurrentes respecto de la carga base (ej. carga base = 20 solicitudes -> pico +50% = 30 solicitudes concurrentes).
 * - Objetivo medible (RNF-02, pág. 11 y 39):
 *   1. Tiempo de respuesta de hasta 2 segundos (<= 2000 ms) para las operaciones principales.
 *   2. Procesar correctamente al menos el 99 % de las solicitudes.
 *   3. Verificar que las solicitudes se distribuyan entre las múltiples instancias del Servidor de Ventas (ADR-01).
 */
const crypto = require('crypto');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const BASE_USERS = Number(process.env.BASE_USERS || 20);
const PEAK_USERS = Math.ceil(BASE_USERS * 1.5); // +50% según RNF-02 (pág. 11)

async function singleRequest(index) {
  const start = Date.now();
  const traceId = crypto.randomUUID();
  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/articulos`, {
      headers: { 'X-Trace-ID': traceId },
    });
    const durationMs = Date.now() - start;
    const instance = res.headers.get('x-ventas-instance') || 'unknown';
    return {
      index,
      ok: res.ok,
      status: res.status,
      durationMs,
      instance,
    };
  } catch (err) {
    return {
      index,
      ok: false,
      status: 0,
      durationMs: Date.now() - start,
      instance: 'error',
      error: err.message,
    };
  }
}

async function runWave(label, count) {
  console.log(`\nEjecutando ${label} (${count} usuarios concurrentes)...`);
  const tasks = Array.from({ length: count }, (_, i) => singleRequest(i + 1));
  const results = await Promise.all(tasks);

  const exitosas = results.filter((r) => r.ok).length;
  const porcentajeExito = ((exitosas / count) * 100).toFixed(2);
  const maxTime = Math.max(...results.map((r) => r.durationMs));
  const avgTime = (
    results.reduce((acc, r) => acc + r.durationMs, 0) / count
  ).toFixed(1);

  const porInstancia = {};
  for (const r of results) {
    porInstancia[r.instance] = (porInstancia[r.instance] || 0) + 1;
  }

  console.log(`   -> Solicitudes exitosas: ${exitosas}/${count} (${porcentajeExito}%) [Objetivo RNF-02: >= 99%]`);
  console.log(`   -> Tiempo promedio: ${avgTime} ms | Tiempo máximo: ${maxTime} ms [Objetivo RNF-02: <= 2000 ms]`);
  console.log(`   -> Distribución por instancia (ADR-01): ${JSON.stringify(porInstancia)}`);

  return { exitosas, count, porcentajeExito: Number(porcentajeExito), maxTime };
}

async function main() {
  console.log('===================================================================');
  console.log(' PRUEBA DE CARGA Y ESCALABILIDAD HORIZONTAL (RNF-02 / ADR-01)');
  console.log('===================================================================');

  await runWave('Carga Base (100%)', BASE_USERS);
  const pico = await runWave('Carga Pico (+50% usuarios concurrentes)', PEAK_USERS);

  console.log('\n-------------------------------------------------------------------');
  if (pico.porcentajeExito >= 99 && pico.maxTime <= 2000) {
    console.log(' RESULTADO: CUMPLE RNF-02 (>= 99% respuestas correctas y tiempo <= 2s)');
  } else {
    console.log(' RESULTADO: Revisar métricas obtenidas frente al umbral de RNF-02');
  }
  console.log('===================================================================');
}

main();
