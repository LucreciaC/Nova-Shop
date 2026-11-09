import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ArticuloEntity, ArticuloRepository } from './articulo.repository';

@Injectable()
export class CatalogoService {
  constructor(private readonly articuloRepo: ArticuloRepository) {}

  async listarArticulos(): Promise<ArticuloEntity[]> {
    return this.articuloRepo.findAll();
  }

  async obtenerArticulo(codigo: string): Promise<ArticuloEntity> {
    const articulo = await this.articuloRepo.findByCodigo(codigo);
    if (!articulo) {
      throw new NotFoundException(`El artículo con código '${codigo}' no existe.`);
    }
    return articulo;
  }

  async crearOModificarArticulo(
    codigo: string,
    body: {
      nombre?: string;
      precioUnitario?: number;
      stock?: number;
      descripcion?: string;
    },
  ): Promise<ArticuloEntity> {
    if (!body.nombre || typeof body.nombre !== 'string') {
      throw new BadRequestException('El nombre del artículo es obligatorio.');
    }
    if (
      body.precioUnitario === undefined ||
      Number(body.precioUnitario) < 0 ||
      Number.isNaN(Number(body.precioUnitario))
    ) {
      throw new BadRequestException(
        'El precio unitario debe ser un número válido mayor o igual a cero.',
      );
    }
    if (
      body.stock !== undefined &&
      (!Number.isInteger(Number(body.stock)) || Number(body.stock) < 0)
    ) {
      throw new BadRequestException(
        'El stock debe manejarse en unidades enteras y no puede quedar negativo (SUP-03).',
      );
    }

    return this.articuloRepo.upsertArticulo(
      codigo.trim().toUpperCase(),
      body.nombre.trim(),
      Number(body.precioUnitario),
      body.stock !== undefined ? Number(body.stock) : undefined,
      body.descripcion,
    );
  }

  async ajustarStock(
    codigo: string,
    body: { stock?: number; ajuste?: number },
  ): Promise<ArticuloEntity> {
    const existe = await this.articuloRepo.findByCodigo(codigo);
    if (!existe) {
      throw new NotFoundException(`El artículo con código '${codigo}' no existe.`);
    }

    if (body.stock !== undefined) {
      const nuevoStock = Number(body.stock);
      if (!Number.isInteger(nuevoStock) || nuevoStock < 0) {
        throw new BadRequestException(
          'El stock se maneja en unidades enteras y no puede ser negativo (SUP-03).',
        );
      }
      const actualizado =
        await this.articuloRepo.actualizarStockAbsolutoODiferencial(
          codigo,
          nuevoStock,
          undefined,
        );
      return actualizado!;
    }

    if (body.ajuste !== undefined) {
      const ajuste = Number(body.ajuste);
      if (!Number.isInteger(ajuste)) {
        throw new BadRequestException(
          'El ajuste de stock debe ser en unidades enteras (SUP-03).',
        );
      }
      const actualizado =
        await this.articuloRepo.actualizarStockAbsolutoODiferencial(
          codigo,
          undefined,
          ajuste,
        );
      if (!actualizado) {
        throw new ConflictException(
          'El ajuste dejaría el stock en un valor negativo (SUP-03).',
        );
      }
      return actualizado;
    }

    throw new BadRequestException(
      "Debe especificar el campo 'stock' (valor absoluto entero >= 0) o 'ajuste' (variación entera).",
    );
  }
}
