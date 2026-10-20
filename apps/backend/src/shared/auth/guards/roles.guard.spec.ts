import { Role } from '@/shared/auth/decorators/roles.decorator';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mock } from 'jest-mock-extended';
import { RolesGuard } from './roles.guard';

const contextFor = (role?: string): ExecutionContext => {
  const request = { session: role ? { user: { role } } : undefined };
  const context = mock<ExecutionContext>();
  context.getHandler.mockReturnValue(() => undefined);
  context.getClass.mockReturnValue(class {});
  context.switchToHttp.mockReturnValue({
    getRequest: () => request,
    getResponse: () => ({}),
    getNext: () => () => undefined,
  } as never);
  return context;
};

const guardRequiring = (roles: Role[] | undefined): RolesGuard => {
  const reflector = mock<Reflector>();
  reflector.getAllAndOverride.mockReturnValue(roles);
  return new RolesGuard(reflector);
};

describe('RolesGuard', () => {
  it('lets everyone through when no roles are declared', () => {
    expect(guardRequiring(undefined).canActivate(contextFor('user'))).toBe(
      true,
    );
  });

  it('lets an admin through an admin-only handler', () => {
    expect(guardRequiring(['admin']).canActivate(contextFor('admin'))).toBe(
      true,
    );
  });

  it('refuses a regular user with 403', () => {
    expect(() =>
      guardRequiring(['admin']).canActivate(contextFor('user')),
    ).toThrow(ForbiddenException);
  });

  it('refuses a request without a role', () => {
    expect(() =>
      guardRequiring(['admin']).canActivate(contextFor(undefined)),
    ).toThrow(ForbiddenException);
  });
});
