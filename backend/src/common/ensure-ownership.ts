import { ForbiddenException, NotFoundException } from '@nestjs/common';

/** 404 si la ressource n'existe pas, 403 si elle appartient à quelqu'un d'autre — partagé entre tous les services qui chargent une ressource par id puis vérifient son propriétaire. */
export function ensureOwnership<T extends { user_id: string }>(
  record: T | null,
  userId: string,
  notFoundMessage: string,
): T {
  if (!record) throw new NotFoundException(notFoundMessage);
  if (record.user_id !== userId) throw new ForbiddenException();
  return record;
}
