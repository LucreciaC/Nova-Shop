import { Controller, Get, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import * as crypto from 'crypto';
import * as os from 'os';
import { AuthModule } from './auth/auth.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { DatabaseModule } from './database/database.module';
import { PedidosModule } from './pedidos/pedidos.module';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'ventas-service',
      instance: process.env.INSTANCE_NAME || os.hostname(),
    };
  }
}

@Module({
  imports: [DatabaseModule, AuthModule, CatalogoModule, PedidosModule],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: () => void) => {
        const traceId = req.headers['x-trace-id'] || crypto.randomUUID();
        const instanceId = process.env.INSTANCE_NAME || os.hostname();
        req.traceId = traceId;
        res.setHeader('X-Trace-ID', traceId);
        res.setHeader('X-Ventas-Instance', instanceId);
        const start = Date.now();

        res.on('finish', () => {
          console.log(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              service: 'ventas-service',
              instance: instanceId,
              traceId,
              method: req.method,
              path: req.originalUrl,
              statusCode: res.statusCode,
              durationMs: Date.now() - start,
            }),
          );
        });
        next();
      })
      .forRoutes('*');
  }
}
