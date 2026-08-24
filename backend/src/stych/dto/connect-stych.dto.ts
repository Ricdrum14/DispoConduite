import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * V0 : l'utilisateur récupère lui-même son cookie de session et son
 * token_csrf via les outils développeur du navigateur (onglet Réseau) sur
 * stych.fr, comme décrit dans le cahier des charges §7 — il n'existe pas
 * (encore) de flux de login scripté documenté pour Stych.
 */
export class ConnectStychDto {
  @IsString()
  @MinLength(1)
  sessionCookie: string;

  @IsString()
  @MinLength(1)
  csrfToken: string;

  @IsOptional()
  @IsString()
  agence?: string;
}
