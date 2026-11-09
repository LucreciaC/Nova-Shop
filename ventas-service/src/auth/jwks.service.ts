import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Servicio de obtención y caché de clave pública JWKS con patrón Circuit Breaker (ADR-05, ADR-08).
 * Permite validar tokens JWT localmente en el Servidor de Ventas sin consultar al Servicio de Identidad
 * en cada confirmación de pedido.
 */
@Injectable()
export class JwksService implements OnModuleInit {
  private cachedPublicKeyPem: string | null = null;
  private circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private consecutiveFailures = 0;
  private openedAt = 0;

  // Parámetros definidos en TP3-1 sección 4 (pág. 59-60)
  private readonly TIMEOUT_MS = 3000;
  private readonly RECOVERY_WAIT_MS = 30000;
  private readonly FAILURE_THRESHOLD = 2;

  private readonly jwksUrl =
    process.env.IDENTITY_JWKS_URL || 'http://localhost:3001/api/v1/auth/jwks';

  async onModuleInit() {
    await this.refreshPublicKey().catch(() => {
      // Se reintentará bajo demanda cuando llegue una petición
    });
  }

  async getPublicKeyPem(): Promise<string> {
    if (this.cachedPublicKeyPem) {
      return this.cachedPublicKeyPem;
    }
    return this.refreshPublicKey();
  }

  async refreshPublicKey(): Promise<string> {
    const now = Date.now();
    if (this.circuitState === 'OPEN') {
      if (now - this.openedAt < this.RECOVERY_WAIT_MS) {
        if (this.cachedPublicKeyPem) {
          return this.cachedPublicKeyPem;
        }
        throw new Error('Circuit Breaker ABIERTO hacia Servicio de Identidad (JWKS).');
      }
      this.circuitState = 'HALF_OPEN';
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(this.jwksUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} al obtener JWKS`);
      }

      const data: any = await response.json();
      const keyEntry = data?.keys?.[0];
      if (!keyEntry) {
        throw new Error('Formato JWKS inválido');
      }

      if (keyEntry.publicKeyPem) {
        this.cachedPublicKeyPem = keyEntry.publicKeyPem;
      } else {
        const keyObject = crypto.createPublicKey({ key: keyEntry, format: 'jwk' });
        this.cachedPublicKeyPem = keyObject
          .export({ type: 'spki', format: 'pem' })
          .toString();
      }

      this.consecutiveFailures = 0;
      this.circuitState = 'CLOSED';
      console.log('[ventas-service] Clave pública JWKS sincronizada y almacenada en caché local.');
      return this.cachedPublicKeyPem!;
    } catch (err) {
      clearTimeout(timer);
      this.consecutiveFailures += 1;
      if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
        this.circuitState = 'OPEN';
        this.openedAt = Date.now();
      }
      if (this.cachedPublicKeyPem) {
        return this.cachedPublicKeyPem;
      }
      throw err;
    }
  }
}
