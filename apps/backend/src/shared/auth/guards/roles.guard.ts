import { Role, ROLES_KEY } from '@/shared/auth/decorators/roles.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Must run after `AuthenticatedUserGuard`, which puts the session on the
 * request: `@UseGuards(AuthenticatedUserGuard, RolesGuard)`.
 * Handlers without `@Roles()` are open to every signed-in user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{
      session?: { user?: Pick<Identity, 'role'> };
    }>();
    const role = request.session?.user?.role;

    if (!role || !requiredRoles.includes(role as Role)) {
      // signed in (the auth guard already ran) but not allowed → 403
      throw new ForbiddenException('You do not have permission to do this');
    }
    return true;
  }
}
