import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { PedidoRepository } from './pedido.repository';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';

@Module({
  imports: [CatalogoModule],
  controllers: [PedidosController],
  providers: [PedidoRepository, PedidosService],
})
export class PedidosModule {}
