import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';

export interface ArticuloEntity {
  codigo: string;
  nombre: string;
  descripcion?: string;
  precioUnitario: number;
  stock: number;
  updatedAt?: Date;
}

/**
 * Patrón Repository para el acceso a datos de Artículos en PostgreSQL (ADR-06)
 */
@Injectable()
export class ArticuloRepository {
  constructor(private readonly db: DatabaseService) {}

  private mapRow(row: any): ArticuloEntity {
    return {
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      precioUnitario: Number(row.precio_unitario),
      stock: Number(row.stock),
      updatedAt: row.updated_at,
    };
  }

  async findAll(): Promise<ArticuloEntity[]> {
    const result = await this.db
      .getPool()
      .query('SELECT * FROM articulos ORDER BY codigo ASC');
    return result.rows.map((r) => this.mapRow(r));
  }

  async findByCodigo(
    codigo: string,
    client?: PoolClient,
  ): Promise<ArticuloEntity | null> {
    const executor = client || this.db.getPool();
    const result = await executor.query(
      'SELECT * FROM articulos WHERE codigo = $1',
      [codigo],
    );
    if (result.rowCount === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async upsertArticulo(
    codigo: string,
    nombre: string,
    precioUnitario: number,
    stock?: number,
    descripcion?: string,
  ): Promise<ArticuloEntity> {
    const stockInicial = stock !== undefined ? stock : 0;
    const result = await this.db.getPool().query(
      `INSERT INTO articulos (codigo, nombre, descripcion, precio_unitario, stock, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (codigo) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         descripcion = COALESCE(EXCLUDED.descripcion, articulos.descripcion),
         precio_unitario = EXCLUDED.precio_unitario,
         stock = CASE WHEN $6::boolean THEN EXCLUDED.stock ELSE articulos.stock END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        codigo,
        nombre,
        descripcion || '',
        precioUnitario,
        stockInicial,
        stock !== undefined,
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  async actualizarStockAbsolutoODiferencial(
    codigo: string,
    nuevoStock?: number,
    ajuste?: number,
  ): Promise<ArticuloEntity | null> {
    if (nuevoStock !== undefined) {
      const result = await this.db.getPool().query(
        `UPDATE articulos
         SET stock = $1, updated_at = CURRENT_TIMESTAMP
         WHERE codigo = $2 AND $1 >= 0
         RETURNING *`,
        [nuevoStock, codigo],
      );
      if (result.rowCount === 0) return null;
      return this.mapRow(result.rows[0]);
    } else if (ajuste !== undefined) {
      const result = await this.db.getPool().query(
        `UPDATE articulos
         SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP
         WHERE codigo = $2 AND (stock + $1) >= 0
         RETURNING *`,
        [ajuste, codigo],
      );
      if (result.rowCount === 0) return null;
      return this.mapRow(result.rows[0]);
    }
    return null;
  }

  /**
   * Actualización condicional atómica de stock dentro de una transacción (TP3-1 pág. 61):
   * UPDATE articulos SET stock = stock - :cantidad WHERE codigo = :codigo AND stock >= :cantidad
   */
  async descontarStockCondicional(
    client: PoolClient,
    codigo: string,
    cantidad: number,
  ): Promise<ArticuloEntity | null> {
    const result = await client.query(
      `UPDATE articulos
       SET stock = stock - $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE codigo = $2
         AND stock >= $1
       RETURNING *`,
      [cantidad, codigo],
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }
}
