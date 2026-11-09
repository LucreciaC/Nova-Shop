import { Module } from '@nestjs/common';
import { ArticuloRepository } from './articulo.repository';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';

@Module({
  controllers: [CatalogoController],
  providers: [ArticuloRepository, CatalogoService],
  exports: [ArticuloRepository, CatalogoService],
})
export class CatalogoModule {}
