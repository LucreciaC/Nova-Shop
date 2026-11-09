import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    exposedHeaders: ['X-Trace-ID', 'X-Ventas-Instance', 'X-Idempotent-Replay'],
  });

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`[ventas-service] Instancia activa escuchando en puerto ${port}`);
}

bootstrap();
