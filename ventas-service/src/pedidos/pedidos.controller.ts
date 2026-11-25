import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { PedidosService } from './pedidos.service';

/**
 * Servicio de Pedidos (Tarea) - Contratos /api/v1/pedidos (TP3-1 Sección 3, pág. 54-57)
 */
@Controller('api/v1/pedidos')
@UseGuards(JwtAuthGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  /**
   * POST /api/v1/pedidos
   * RF-07 a RF-11: Confirmar un pedido (Rol requerido: Cliente)
   */
  @Post()
  @Roles('cliente', 'administrador')
  async confirmarPedido(
    @Req() req: any,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: { lineas?: Array<{ codigoArticulo: string; cantidad: number }> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { pedido, yaRegistrado } = await this.pedidosService.confirmarPedido(
      req.user,
      idempotencyKey,
      body,
    );

    if (yaRegistrado) {
      res.setHeader('X-Idempotent-Replay', 'true');
      res.status(200);
    } else {
      res.status(201);
    }

    return pedido;
  }

  /**
   * GET /api/v1/pedidos
   * RF-07: Listar pedidos propios
   */
  @Get()
  @Roles('cliente', 'administrador')
  async listarPedidos(@Req() req: any) {
    return this.pedidosService.listarPedidos(req.user);
  }

  /**
   * GET /api/v1/pedidos/:numero
   * RF-08: Consultar un pedido propio
   */
  @Get(':numero')
  @Roles('cliente', 'administrador')
  async consultarPedido(@Param('numero') numero: string, @Req() req: any) {
    const num = Number(numero);
    if (Number.isNaN(num)) {
      throw new BadRequestException('El número de pedido debe ser numérico.');
    }
    return this.pedidosService.consultarPedido(num, req.user);
  }
}
