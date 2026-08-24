import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Bloque une route tant que l'email du compte n'est pas vérifié — utilisé
 * sur le point d'entrée Stych (POST /stych/connect) : sans ça, impossible
 * d'obtenir une session Stych, donc impossible d'aller plus loin dans le
 * flow (polling, réservation) avec un compte non vérifié.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user?.email_verified) {
      throw new ForbiddenException('Vérifie ton adresse email avant de connecter ton compte Stych.');
    }
    return true;
  }
}
