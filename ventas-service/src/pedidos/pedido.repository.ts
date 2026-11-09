import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';

export interface LineaPedidoDto {
  codigoArticulo: string;
  nombreArticulo?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PedidoRespuestaDto {
  numero: number;
  fecha: string;
  usuario: string;
  nombreCliente: string;
  lineas: LineaPedidoDto[];
  importeTotal: number;
  idempotencyKey?: string;
  recuperadoPorIdempotencia?: boolean;
}

/**
 * Patrón Repository para el acceso a datos de Pedidos en PostgreSQL (ADR-06, ADR-09)
 */
@Injectable()
export class PedidoRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByIdempotencyKey(
    idempotencyKey: string,
    client?: PoolClient,
  ): Promise<PedidoRespuestaDto | null> {
    const executor = client || this.db.getPool();
    const pedRes = await executor.query(
      'SELECT * FROM pedidos WHERE idempotency_key = $1',
      [idempotencyKey],
    );
    if (pedRes.rowCount === 0) return null;
    const pedidoRow = pedRes.rows[0];
    return this.buildPedidoDto(pedidoRow, executor);
  }

  async findByNumero(numero: number): Promise<PedidoRespuestaDto | null> {
    const pedRes = await this.db
      .getPool()
      .query('SELECT * FROM pedidos WHERE numero = $1', [numero]);
    if (pedRes.rowCount === 0) return null;
    return this.buildPedidoDto(pedRes.rows[0], this.db.getPool());
  }

  async findAllByUsuario(
    usuario: string,
    esAdmin = false,
  ): Promise<PedidoRespuestaDto[]> {
    const pool = this.db.getPool();
    const pedRes = esAdmin
      ? await pool.query('SELECT * FROM pedidos ORDER BY numero DESC')
      : await pool.query(
          'SELECT * FROM pedidos WHERE usuario = $1 ORDER BY numero DESC',
          [usuario],
        );

    const resultado: PedidoRespuestaDto[] = [];
    for (const row of pedRes.rows) {
      resultado.push(await this.buildPedidoDto(row, pool));
    }
    return resultado;
  }

  async crearPedidoEnTransaccion(
    client: PoolClient,
    datos: {
      usuario: string;
      nombreCliente: string;
      importeTotal: number;
      idempotencyKey: string;
      lineas: LineaPedidoDto[];
    },
  ): Promise<PedidoRespuestaDto> {
    const pedRes = await client.query(
      `INSERT INTO pedidos (usuario, nombre_cliente, importe_total, idempotency_key)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        datos.usuario,
        datos.nombreCliente,
        datos.importeTotal,
        datos.idempotencyKey,
      ],
    );
    const pedidoRow = pedRes.rows[0];

    for (const linea of datos.lineas) {
      await client.query(
        `INSERT INTO lineas_pedido
         (pedido_numero, codigo_articulo, nombre_articulo, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          pedidoRow.numero,
          linea.codigoArticulo,
          linea.nombreArticulo || linea.codigoArticulo,
          linea.cantidad,
          linea.precioUnitario,
          linea.subtotal,
        ],
      );
    }

    return {
      numero: Number(pedidoRow.numero),
      fecha: new Date(pedidoRow.fecha).toISOString(),
      usuario: pedidoRow.usuario,
      nombreCliente: pedidoRow.nombre_cliente,
      lineas: datos.lineas.map((l) => ({
        codigoArticulo: l.codigoArticulo,
        nombreArticulo: l.nombreArticulo,
        cantidad: Number(l.cantidad),
        precioUnitario: Number(l.precioUnitario),
        subtotal: Number(l.subtotal),
      })),
      importeTotal: Number(pedidoRow.importe_total),
    };
  }

  private async buildPedidoDto(
    pedidoRow: any,
    executor: any,
  ): Promise<PedidoRespuestaDto> {
    const lineasRes = await executor.query(
      'SELECT * FROM lineas_pedido WHERE pedido_numero = $1 ORDER BY id ASC',
      [pedidoRow.numero],
    );

    const lineas: LineaPedidoDto[] = lineasRes.rows.map((l: any) => ({
      codigoArticulo: l.codigo_articulo,
      nombreArticulo: l.nombre_articulo,
      cantidad: Number(l.cantidad),
      precioUnitario: Number(l.precio_unitario),
      subtotal: Number(l.subtotal),
    }));

    return {
      numero: Number(pedidoRow.numero),
      fecha: new Date(pedidoRow.fecha).toISOString(),
      usuario: pedidoRow.usuario,
      nombreCliente: pedidoRow.nombre_cliente,
      lineas,
      importeTotal: Number(pedidoRow.importe_total),
    };
  }
}
