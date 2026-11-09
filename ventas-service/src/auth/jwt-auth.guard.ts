import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { JwksService } from './jwks.service';
import { ROLES_KEY } from './roles.decorator';

/**
 * Guard de validación local de JWT (ADR-08, pág. 59 y 65-66).
 * El Servidor de Ventas valida la firma RS256, el vencimiento y el rol del usuario
 * utilizando la clave pública cacheada desde GET /auth/jwks.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwksService: JwksService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token ausente o formato inválido.');
    }

    const token = authHeader.split(' ')[1];
    let publicKey: string;
    try {
      publicKey = await this.jwksService.getPublicKeyPem();
    } catch (err) {
      throw new UnauthorizedException(
        'No se pudo obtener la clave pública para verificar el token.',
      );
    }

    let payload: any;
    try {
      payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    } catch (err) {
      throw new UnauthorizedException('Token vencido o con firma inválida.');
    }

    if (payload.estado && payload.estado !== 'activo') {
      throw new ForbiddenException('La cuenta del usuario no se encuentra activa.');
    }

    req.user = payload;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(payload.rol)) {
        throw new ForbiddenException(
          `El usuario con rol '${payload.rol}' no tiene permisos. Roles requeridos: ${requiredRoles.join(', ')}`,
        );
      }
    }

    return true;
  }
}
