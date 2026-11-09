/**
 * Implementación del patrón Circuit Breaker (ADR-05, TP3-1 pág. 59-60)
 * Parámetros definidos:
 * - Tiempo máximo de espera (timeout): 3 segundos (3000 ms).
 * - Apertura del circuito: Cuando se producen fallas consecutivas o se supera el tiempo máximo de espera.
 * - Intento de recuperación: luego de un período de espera de 30 segundos (30000 ms).
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.timeoutMs = options.timeoutMs || 3000;
    this.failureThreshold = options.failureThreshold || 2;
    this.recoveryTimeMs = options.recoveryTimeMs || 30000;

    this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.lastError = null;
  }

  getStatus() {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.recoveryTimeMs) {
        this.state = 'HALF_OPEN';
      }
    }
    return {
      name: this.name,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.openedAt ? new Date(this.openedAt).toISOString() : null,
      remainingRecoveryMs:
        this.state === 'OPEN'
          ? Math.max(0, this.recoveryTimeMs - (Date.now() - this.openedAt))
          : 0,
      lastError: this.lastError,
      config: {
        timeoutMs: this.timeoutMs,
        failureThreshold: this.failureThreshold,
        recoveryTimeMs: this.recoveryTimeMs,
      },
    };
  }

  async execute(requestFn) {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed < this.recoveryTimeMs) {
        const remainingSec = Math.ceil((this.recoveryTimeMs - elapsed) / 1000);
        const err = new Error(
          `Circuito '${this.name}' ABIERTO. El servicio solicitado no se encuentra disponible temporalmente. Intento de recuperación en ${remainingSec}s.`,
        );
        err.code = 'CIRCUIT_OPEN';
        throw err;
      }
      this.state = 'HALF_OPEN';
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await requestFn(controller.signal);
      clearTimeout(timer);

      if (response.status >= 500) {
        throw new Error(`Upstream HTTP ${response.status}`);
      }

      // Éxito: cerrar circuito y reiniciar contador
      this.consecutiveFailures = 0;
      this.state = 'CLOSED';
      this.openedAt = null;
      this.lastError = null;
      return response;
    } catch (err) {
      clearTimeout(timer);
      this.consecutiveFailures += 1;
      this.lastError =
        err.name === 'AbortError'
          ? `Timeout superado (> ${this.timeoutMs}ms)`
          : err.message;

      if (
        this.state === 'HALF_OPEN' ||
        this.consecutiveFailures >= this.failureThreshold ||
        err.name === 'AbortError'
      ) {
        this.state = 'OPEN';
        this.openedAt = Date.now();
        console.warn(
          `[api-gateway][CircuitBreaker:${this.name}] CIRCUITO ABIERTO tras falla: ${this.lastError}`,
        );
      }

      const wrapped = new Error(
        `Falla al comunicar con '${this.name}': ${this.lastError}`,
      );
      wrapped.code = 'UPSTREAM_FAILURE';
      wrapped.circuitState = this.state;
      throw wrapped;
    }
  }
}

module.exports = CircuitBreaker;
