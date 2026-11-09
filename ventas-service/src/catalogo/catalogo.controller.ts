import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { CatalogoService } from './catalogo.service';

/**
 * Servicio de Catálogo (Entidad) - Contratos /api/v1/articulos (TP3-1 Sección 3, pág. 54)
 */
@Controller('api/v1/articulos')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  /**
   * GET /api/v1/articulos
   * RF-05, RF-06: Consultar catálogo (código, nombre, stock disponible y precio unitario)
   */
  @Get()
  async listarArticulos() {
    return this.catalogoService.listarArticulos();
  }

  /**
   * GET /api/v1/articulos/:codigo
   * RF-06: Consultar un artículo específico
   */
  @Get(':codigo')
  async obtenerArticulo(@Param('codigo') codigo: string) {
    return this.catalogoService.obtenerArticulo(codigo);
  }

  /**
   * PUT /api/v1/articulos/:codigo
   * RF-12: Crear o modificar un artículo y su precio (Rol requerido: Administrador)
   */
  @Put(':codigo')
  @UseGuards(JwtAuthGuard)
  @Roles('administrador')
  async crearOModificarArticulo(
    @Param('codigo') codigo: string,
    @Body()
    body: {
      nombre?: string;
      precioUnitario?: number;
      stock?: number;
      descripcion?: string;
    },
  ) {
    return this.catalogoService.crearOModificarArticulo(codigo, body);
  }

  /**
   * PATCH /api/v1/articulos/:codigo/stock
   * RF-12: Ajustar stock (Rol requerido: Administrador)
   */
  @Patch(':codigo/stock')
  @UseGuards(JwtAuthGuard)
  @Roles('administrador')
  async ajustarStock(
    @Param('codigo') codigo: string,
    @Body() body: { stock?: number; ajuste?: number },
  ) {
    return this.catalogoService.ajustarStock(codigo, body);
  }
}
