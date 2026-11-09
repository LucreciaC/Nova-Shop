import { Global, Module } from '@nestjs/common';
import { JwksService } from './jwks.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Global()
@Module({
  providers: [JwksService, JwtAuthGuard],
  exports: [JwksService, JwtAuthGuard],
})
export class AuthModule {}
