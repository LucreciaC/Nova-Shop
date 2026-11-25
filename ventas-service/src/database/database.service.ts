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

        CREATE TABLE IF NOT EXISTS comentarios_articulo (
          id SERIAL PRIMARY KEY,
          codigo_articulo VARCHAR(50) NOT NULL REFERENCES articulos(codigo) ON DELETE CASCADE,
          usuario VARCHAR(100) NOT NULL,
          nombre_cliente VARCHAR(255) NOT NULL,
          calificacion INTEGER NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
          texto TEXT NOT NULL,
          fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

      // Semilla inicial de comentarios reales si la tabla está vacía
      const countRes = await client.query('SELECT COUNT(*) FROM comentarios_articulo');
      if (Number(countRes.rows[0].count) === 0) {
        await client.query(`
          INSERT INTO comentarios_articulo (codigo_articulo, usuario, nombre_cliente, calificacion, texto)
          VALUES
            ('A-1001', 'camila_olivera', 'Camila Olivera', 5, 'La cancelación de ruido es impresionante, los uso todos los días para estudiar y la batería dura muchísimo.'),
            ('A-1001', 'juan_narvaez', 'Juan Narvaez', 5, 'Excelente calidad de sonido y muy cómodos incluso después de varias horas.'),
            ('A-1002', 'rocio_santilli', 'Rocío Santilli', 5, 'Súper liviana y rápida para programar y levantar contenedores. La pantalla IPS se ve impecable.'),
            ('A-1003', 'juan_narvaez', 'Juan Narvaez', 5, 'Los switches Red son re silenciosos y la construcción en aluminio se siente muy sólida.'),
            ('A-1004', 'lucre_concatti', 'Lucrecia Concatti', 5, 'El GPS es súper preciso para salir a correr y la pantalla se ve perfecto bajo el sol.'),
            ('A-1005', 'camila_olivera', 'Camila Olivera', 4, 'Muy liviano y preciso, la batería inalámbrica dura toda la semana sin cargarlo.'),
            ('A-1006', 'rocio_santilli', 'Rocío Santilli', 5, 'El sonido 360 llena todo el living y reconoce los comandos de voz al instante.'),
            ('A-1007', 'lucre_concatti', 'Lucrecia Concatti', 5, 'Los 144Hz y la resolución QHD hacen una diferencia enorme tanto para diseño como para gaming.'),
            ('A-1008', 'camila_olivera', 'Camila Olivera', 5, 'Fácil de configurar con el Wi-Fi de casa, los colores cálidos y RGB quedan hermosos.'),
            ('A-1009', 'juan_narvaez', 'Juan Narvaez', 5, 'Carga mi notebook y el celular al mismo tiempo sin calentarse nada. Muy recomendable.');
        `);
      }

      console.log('[ventas-service] Esquema PostgreSQL y semilla de catálogo inicializados.');
    } finally {
      client.release();
    }
  }
}
