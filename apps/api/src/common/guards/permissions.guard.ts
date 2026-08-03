import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Permission } from "../../shared-types";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) return false;

    const hasAll = required.every((p) => user.permissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenException(
        `Missing required permission(s): ${required.filter((p) => !user.permissions.includes(p)).join(", ")}`,
      );
    }
    return true;
  }
}
