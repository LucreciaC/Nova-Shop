import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ArticuloRepository } from '../catalogo/articulo.repository';
import { DatabaseService } from '../database/database.service';
import {
  LineaPedidoDto,
  PedidoRepository,
  PedidoRespuestaDto,
} from './pedido.repository';

/**
 * Servicio de Pedidos (Tarea) - Composición de confirmación de pedido (TP3-1 Sección 5, pág. 63)
 * Implementa:
 * - ADR-02: Control transaccional con UPDATE condicional para garantizar consistencia del stock
 * - ADR-08: Identidad y nombre del cliente extraídos del JWT validado localmente
 * - ADR-09: Confirmación idempotente mediante Idempotency-Key única
 */
@Injectable()
export class PedidosService {
  constructor(
    private readonly db: DatabaseService,
    private readonly articuloRepo: ArticuloRepository,
    private readonly pedidoRepo: PedidoRepository,
  ) {}

  async confirmarPedido(
    userPayload: { usuario: string; nombreCliente: string; rol: string },
    idempotencyKey: string | undefined,
    body: { lineas?: Array<{ codigoArticulo: string; cantidad: number }> },
  ): Promise<{ pedido: PedidoRespuestaDto; yaRegistrado: boolean }> {
    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new BadRequestException(
        'El encabezado Idempotency-Key es obligatorio para confirmar un pedido (ADR-09).',
      );
    }

    const cleanKey = idempotencyKey.trim();

    // Paso 4 y 5 (pág. 63): Comprobar si la clave de idempotencia ya fue procesada
    const pedidoExistente =
      await this.pedidoRepo.findByIdempotencyKey(cleanKey);
    if (pedidoExistente) {
      if (pedidoExistente.usuario !== userPayload.usuario) {
        throw new ConflictException(
          'La Idempotency-Key ya fue utilizada por otro usuario.',
        );
      }
      return {
        pedido: { ...pedidoExistente, recuperadoPorIdempotencia: true },
        yaRegistrado: true,
      };
    }

    if (
      !body ||
      !Array.isArray(body.lineas) ||
      body.lineas.length === 0
    ) {
      throw new BadRequestException(
        'El pedido debe incluir al menos una línea de artículo (SUP-01).',
      );
    }

    for (const item of body.lineas) {
      if (
        !item.codigoArticulo ||
        typeof item.codigoArticulo !== 'string' ||
        !Number.isInteger(Number(item.cantidad)) ||
        Number(item.cantidad) <= 0
      ) {
        throw new BadRequestException(
          'Cada línea debe tener un codigoArticulo válido y una cantidad entera positiva (400 Bad Request).',
        );
      }
    }

    // Paso 6 (pág. 63): Iniciar la transacción de compra en PostgreSQL
    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');

      // Verificar idempotencia dentro de la transacción por si llegaron dos reintentos simultáneos
      const existenteEnTx = await this.pedidoRepo.findByIdempotencyKey(
        cleanKey,
        client,
      );
      if (existenteEnTx) {
        await client.query('ROLLBACK');
        return {
          pedido: { ...existenteEnTx, recuperadoPorIdempotencia: true },
          yaRegistrado: true,
        };
      }

      const lineasConfirmadas: LineaPedidoDto[] = [];
      let importeTotal = 0;

      // Paso 7 y 8 (pág. 63): Consultar precio vigente y realizar actualización condicional del stock
      for (const lineaSolicitada of body.lineas) {
        const codigo = lineaSolicitada.codigoArticulo.trim().toUpperCase();
        const cantidad = Number(lineaSolicitada.cantidad);

        const articuloActualizado =
          await this.articuloRepo.descontarStockCondicional(
            client,
            codigo,
            cantidad,
          );

        if (!articuloActualizado) {
          // Distinguir entre 404 Not Found y 409 Conflict (pág. 57 y 61)
          const existeArticulo = await this.articuloRepo.findByCodigo(
            codigo,
            client,
          );
          await client.query('ROLLBACK');

          if (!existeArticulo) {
            throw new NotFoundException(
              `El código de artículo '${codigo}' no existe (404 Not Found).`,
            );
          }

          throw new ConflictException(
            `Stock insuficiente para el artículo '${codigo}' (${existeArticulo.nombre}). Stock disponible: ${existeArticulo.stock}, solicitado: ${cantidad}. La operación se revierte sin dejar pedido parcial (409 Conflict).`,
          );
        }

        const precioUnitario = Number(articuloActualizado.precioUnitario);
        const subtotal = Number((precioUnitario * cantidad).toFixed(2));
        importeTotal = Number((importeTotal + subtotal).toFixed(2));

        lineasConfirmadas.push({
          codigoArticulo: articuloActualizado.codigo,
          nombreArticulo: articuloActualizado.nombre,
          cantidad,
          precioUnitario,
          subtotal,
        });
      }

      // Paso 9 (pág. 63): Guardar el pedido, sus líneas y la clave de idempotencia, y confirmar la transacción
      const nuevoPedido = await this.pedidoRepo.crearPedidoEnTransaccion(
        client,
        {
          usuario: userPayload.usuario,
          nombreCliente: userPayload.nombreCliente || userPayload.usuario,
          importeTotal,
          idempotencyKey: cleanKey,
          lineas: lineasConfirmadas,
        },
      );

      await client.query('COMMIT');
      return { pedido: nuevoPedido, yaRegistrado: false };
    } catch (err: any) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}

      // Si ocurrió una colisión UNIQUE en idempotency_key por carrera simultánea, devolver el pedido registrado
      if (err?.code === '23505') {
        const recuperado =
          await this.pedidoRepo.findByIdempotencyKey(cleanKey);
        if (recuperado) {
          return {
            pedido: { ...recuperado, recuperadoPorIdempotencia: true },
            yaRegistrado: true,
          };
        }
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async listarPedidos(userPayload: {
    usuario: string;
    rol: string;
  }): Promise<PedidoRespuestaDto[]> {
    const esAdmin = userPayload.rol === 'administrador';
    return this.pedidoRepo.findAllByUsuario(userPayload.usuario, esAdmin);
  }

  async consultarPedido(
    numero: number,
    userPayload: { usuario: string; rol: string },
  ): Promise<PedidoRespuestaDto> {
    const pedido = await this.pedidoRepo.findByNumero(numero);
    if (!pedido) {
      throw new NotFoundException(`El pedido #${numero} no existe.`);
    }
    if (
      userPayload.rol !== 'administrador' &&
      pedido.usuario !== userPayload.usuario
    ) {
      throw new ForbiddenException(
        'No tiene permiso para consultar pedidos de otro cliente.',
      );
    }
    return pedido;
  }
}
