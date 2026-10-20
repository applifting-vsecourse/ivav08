import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type Role = 'user' | 'admin';

/**
 * Marks a controller or a handler as allowed only for the listed roles.
 * It only attaches metadata — `RolesGuard` is what enforces it.
 */
export const Roles = (...roles: Role[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
