import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';

export interface LineaPedidoDto {
  codigoArticulo: string;
  nombreArticulo?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface BlockchainProofDto {
  blockIndex: number;
  blockHash: string;
  previousHash: string;
  payloadHash: string;
  nonce: number;
  timestampIso: string;
  verified: boolean;
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
  blockchain?: BlockchainProofDto;
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

    const lineasNormalizadas = datos.lineas.map((l) => ({
      codigoArticulo: l.codigoArticulo,
      nombreArticulo: l.nombreArticulo,
      cantidad: Number(l.cantidad),
      precioUnitario: Number(l.precioUnitario),
      subtotal: Number(l.subtotal),
    }));

    const fechaIso = new Date(pedidoRow.fecha).toISOString();
    const blockchainProof = await this.minarBloquePedidoEnTransaccion(client, {
      numero: Number(pedidoRow.numero),
      fechaIso,
      usuario: pedidoRow.usuario,
      nombreCliente: pedidoRow.nombre_cliente,
      importeTotal: Number(pedidoRow.importe_total),
      lineas: lineasNormalizadas,
    });

    return {
      numero: Number(pedidoRow.numero),
      fecha: fechaIso,
      usuario: pedidoRow.usuario,
      nombreCliente: pedidoRow.nombre_cliente,
      lineas: lineasNormalizadas,
      importeTotal: Number(pedidoRow.importe_total),
      blockchain: blockchainProof,
    };
  }

  public calcularPayloadHash(datos: {
    numero: number;
    usuario: string;
    importeTotal: number;
    lineas: Array<{ codigoArticulo: string; cantidad: number; subtotal: number }>;
  }): string {
    const canonico = JSON.stringify({
      numero: Number(datos.numero),
      usuario: String(datos.usuario),
      importeTotal: Number(datos.importeTotal).toFixed(2),
      lineas: datos.lineas.map((l) => ({
        c: l.codigoArticulo,
        q: Number(l.cantidad),
        s: Number(l.subtotal).toFixed(2),
      })),
    });
    return crypto.createHash('sha256').update(canonico).digest('hex');
  }

  public calcularBlockHash(
    blockIndex: number,
    previousHash: string,
    timestampIso: string,
    payloadHash: string,
    nonce: number,
  ): string {
    return crypto
      .createHash('sha256')
      .update(`${blockIndex}|${previousHash}|${timestampIso}|${payloadHash}|${nonce}`)
      .digest('hex');
  }

  private async minarBloquePedidoEnTransaccion(
    executor: any,
    datos: {
      numero: number;
      fechaIso: string;
      usuario: string;
      nombreCliente: string;
      importeTotal: number;
      lineas: LineaPedidoDto[];
    },
  ): Promise<BlockchainProofDto> {
    // Bloquear último bloque de la cadena para garantizar orden estricto entre instancias concurrentes
    const lastRes = await executor.query(
      'SELECT * FROM blockchain_ledger ORDER BY block_index DESC LIMIT 1 FOR UPDATE',
    );
    const lastBlock = lastRes.rows[0];
    const nextIndex = Number(lastBlock.block_index) + 1;
    const previousHash = String(lastBlock.block_hash);
    const payloadHash = this.calcularPayloadHash(datos);

    // Proof-of-Work liviano (prefijo '00') para demostración instantánea sin demorar la compra
    let nonce = 0;
    let blockHash = '';
    while (true) {
      blockHash = this.calcularBlockHash(
        nextIndex,
        previousHash,
        datos.fechaIso,
        payloadHash,
        nonce,
      );
      if (blockHash.startsWith('00') || nonce > 2500) {
        break;
      }
      nonce++;
    }

    const dataJson = {
      pedidoNumero: datos.numero,
      usuario: datos.usuario,
      nombreCliente: datos.nombreCliente,
      importeTotal: datos.importeTotal,
      cantidadArticulos: datos.lineas.reduce((a, l) => a + l.cantidad, 0),
    };

    await executor.query(
      `INSERT INTO blockchain_ledger
       (block_index, pedido_numero, timestamp_iso, payload_hash, previous_hash, block_hash, nonce, data_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        nextIndex,
        datos.numero,
        datos.fechaIso,
        payloadHash,
        previousHash,
        blockHash,
        nonce,
        JSON.stringify(dataJson),
      ],
    );

    return {
      blockIndex: nextIndex,
      blockHash,
      previousHash,
      payloadHash,
      nonce,
      timestampIso: datos.fechaIso,
      verified: true,
    };
  }

  async obtenerCadenaVerificada(
    usuarioActual?: string,
    esAdmin = false,
  ): Promise<{
    cadenaIntegra: boolean;
    totalBloques: number;
    bloquesMostrados: number;
    vistaRol: string;
    algoritmo: string;
    dificultadPoW: string;
    bloques: any[];
  }> {
    const pool = this.db.getPool();

    // Asegurar que cualquier pedido histórico anterior a la activación de Blockchain tenga su bloque
    const pedidosSinBloque = await pool.query(`
      SELECT p.* FROM pedidos p
      LEFT JOIN blockchain_ledger b ON b.pedido_numero = p.numero
      WHERE b.block_index IS NULL
      ORDER BY p.numero ASC
    `);
    for (const pRow of pedidosSinBloque.rows) {
      await this.buildPedidoDto(pRow, pool);
    }

    const res = await pool.query(
      'SELECT * FROM blockchain_ledger ORDER BY block_index ASC',
    );

    const todosLosBloques = [];
    let cadenaIntegra = true;

    for (let i = 0; i < res.rows.length; i++) {
      const row = res.rows[i];
      const idx = Number(row.block_index);
      let bloqueValido = true;
      let motivoFallo = null;

      if (idx > 0) {
        const prevRow = res.rows[i - 1];
        const expectedPrevHash = String(prevRow.block_hash);
        const recalculatedHash = this.calcularBlockHash(
          idx,
          row.previous_hash,
          row.timestamp_iso,
          row.payload_hash,
          Number(row.nonce),
        );

        if (row.previous_hash !== expectedPrevHash) {
          bloqueValido = false;
          motivoFallo = 'Ruptura de enlace con previous_hash';
        } else if (recalculatedHash !== row.block_hash) {
          bloqueValido = false;
          motivoFallo = 'Hash del bloque alterado';
        }
      }

      if (!bloqueValido) {
        cadenaIntegra = false;
      }

      todosLosBloques.push({
        blockIndex: idx,
        pedidoNumero: row.pedido_numero ? Number(row.pedido_numero) : null,
        timestampIso: row.timestamp_iso,
        payloadHash: row.payload_hash,
        previousHash: row.previous_hash,
        blockHash: row.block_hash,
        nonce: Number(row.nonce),
        datos: row.data_json,
        valido: bloqueValido,
        motivoFallo,
      });
    }

    // Si es Cliente (no Admin), filtrar por privacidad (RF-07 / RF-08): solo ve sus propios bloques
    const bloquesVisibles = esAdmin
      ? todosLosBloques
      : todosLosBloques.filter(
          (b) => b.blockIndex > 0 && b.datos?.usuario === usuarioActual,
        );

    return {
      cadenaIntegra,
      totalBloques: todosLosBloques.length,
      bloquesMostrados: bloquesVisibles.length,
      vistaRol: esAdmin ? 'administrador' : 'cliente',
      algoritmo: 'SHA-256 + Proof-of-Work (00*)',
      dificultadPoW: 'Prefijo 00',
      bloques: bloquesVisibles,
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

    const fechaIso = new Date(pedidoRow.fecha).toISOString();
    let bcRes = await executor.query(
      'SELECT * FROM blockchain_ledger WHERE pedido_numero = $1',
      [pedidoRow.numero],
    );

    let blockchainProof: BlockchainProofDto;
    if (bcRes.rowCount === 0) {
      blockchainProof = await this.minarBloquePedidoEnTransaccion(executor, {
        numero: Number(pedidoRow.numero),
        fechaIso,
        usuario: pedidoRow.usuario,
        nombreCliente: pedidoRow.nombre_cliente,
        importeTotal: Number(pedidoRow.importe_total),
        lineas,
      });
    } else {
      const b = bcRes.rows[0];
      const payloadActual = this.calcularPayloadHash({
        numero: Number(pedidoRow.numero),
        usuario: pedidoRow.usuario,
        importeTotal: Number(pedidoRow.importe_total),
        lineas,
      });
      blockchainProof = {
        blockIndex: Number(b.block_index),
        blockHash: b.block_hash,
        previousHash: b.previous_hash,
        payloadHash: b.payload_hash,
        nonce: Number(b.nonce),
        timestampIso: b.timestamp_iso,
        verified: payloadActual === b.payload_hash,
      };
    }

    return {
      numero: Number(pedidoRow.numero),
      fecha: fechaIso,
      usuario: pedidoRow.usuario,
      nombreCliente: pedidoRow.nombre_cliente,
      lineas,
      importeTotal: Number(pedidoRow.importe_total),
      blockchain: blockchainProof,
    };
  }
}
