import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * Blanket audit-trail coverage: every mutating request that reaches a
 * controller is logged with its route and outcome. Domain services layer
 * richer before/after diffs on top via `AuditService.record` for
 * business-critical actions (sale void, stock adjustment, role changes).
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!MUTATING_METHODS.has(request.method)) {
      return next.handle();
    }

    const user = (request as unknown as { user?: AuthenticatedUser }).user;
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    return next.handle().pipe(
      tap(() => {
        if (!user) return;
        void this.auditService.record({
          orgId: user.orgId,
          userId: user.id,
          action: `${controller}.${handler}`,
          entityType: controller.replace("Controller", ""),
          after: request.method === "DELETE" ? undefined : (request.body as unknown),
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });
      }),
    );
  }
}
