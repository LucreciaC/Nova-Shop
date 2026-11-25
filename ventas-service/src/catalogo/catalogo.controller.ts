import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
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

  /**
   * GET /api/v1/articulos/:codigo/comentarios
   * Consultar reseñas y comentarios de clientes sobre un producto
   */
  @Get(':codigo/comentarios')
  async listarComentarios(@Param('codigo') codigo: string) {
    return this.catalogoService.listarComentarios(codigo);
  }

  /**
   * POST /api/v1/articulos/:codigo/comentarios
   * Publicar un comentario y calificación (1 a 5 estrellas) sobre un producto (Usuario autenticado)
   */
  @Post(':codigo/comentarios')
  @UseGuards(JwtAuthGuard)
  @Roles('cliente', 'administrador')
  async agregarComentario(
    @Param('codigo') codigo: string,
    @Req() req: any,
    @Body() body: { calificacion?: number; texto?: string },
  ) {
    return this.catalogoService.agregarComentario(codigo, req.user, body);
  }
}
