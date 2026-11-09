import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/novashop_ventas',
    });
  }

  async onModuleInit() {
    await this.initSchemaAndSeed();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  getPool(): Pool {
    return this.pool;
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  private async initSchemaAndSeed() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS articulos (
          codigo VARCHAR(50) PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          descripcion TEXT,
          precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
          stock INTEGER NOT NULL CHECK (stock >= 0),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pedidos (
          numero SERIAL PRIMARY KEY,
          fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          usuario VARCHAR(100) NOT NULL,
          nombre_cliente VARCHAR(255) NOT NULL,
          importe_total NUMERIC(12, 2) NOT NULL,
          idempotency_key VARCHAR(255) UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lineas_pedido (
          id SERIAL PRIMARY KEY,
          pedido_numero INTEGER NOT NULL REFERENCES pedidos(numero) ON DELETE CASCADE,
          codigo_articulo VARCHAR(50) NOT NULL REFERENCES articulos(codigo),
          nombre_articulo VARCHAR(255) NOT NULL,
          cantidad INTEGER NOT NULL CHECK (cantidad > 0),
          precio_unitario NUMERIC(12, 2) NOT NULL,
          subtotal NUMERIC(12, 2) NOT NULL
        );
      `);

      // Semilla inicial de artículos cubriendo las 5 categorías de NEXO Store y preservando A-1001 con 5 unidades para el escenario TP1/TP3
      await client.query(`
        INSERT INTO articulos (codigo, nombre, descripcion, precio_unitario, stock)
        VALUES
          ('A-1001', 'Auriculares Bluetooth Pro', 'Cancelación de ruido activa · Bluetooth 5.3 · Hasta 40 h de batería (Escenario TP1/TP3: 5 unidades iniciales)', 210000.00, 5),
          ('A-1002', 'Notebook 14" Ultra', '8GB RAM · 256GB SSD · Pantalla IPS Full HD · Procesador de alto rendimiento', 1350000.00, 8),
          ('A-1003', 'Teclado Mecánico RGB', 'RGB · Switch Red silencioso · Construcción en aluminio · Formato TKL', 125000.00, 15),
          ('A-1004', 'Smartwatch Series X', 'Salud y deporte · GPS integrado · Resistente al agua 5ATM · Monitoreo cardíaco', 189000.00, 12),
          ('A-1005', 'Mouse Inalámbrico Gaming', 'Sensor óptico 16000 DPI · Ultraligero 62g · Batería de 70 horas', 85000.00, 10),
          ('A-1006', 'Parlante Inteligente Wi-Fi', 'Sonido 360° de alta fidelidad · Control por voz para el hogar', 142000.00, 6),
          ('A-1007', 'Monitor IPS 27" QHD', 'Informática · 144Hz · Bordes ultradelgados · HDMI y DisplayPort', 420000.00, 7),
          ('A-1008', 'Lámpara Smart LED Wi-Fi', 'Hogar inteligente · 16 millones de colores · Control por app y voz', 58000.00, 14),
          ('A-1009', 'Cargador Rápido GaN 65W', 'Accesorios · Doble puerto USB-C + USB-A · Carga rápida universal', 49000.00, 20)
        ON CONFLICT (codigo) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          descripcion = EXCLUDED.descripcion,
          precio_unitario = EXCLUDED.precio_unitario;
      `);

      console.log('[ventas-service] Esquema PostgreSQL y semilla de catálogo inicializados.');
    } finally {
      client.release();
    }
  }
}
