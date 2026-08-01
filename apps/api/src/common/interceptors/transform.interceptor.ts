import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * Serializes Prisma `Decimal` and `BigInt` values to plain numbers/strings
 * before they hit JSON.stringify, which otherwise throws on BigInt and
 * leaks Decimal internals (`{ s, e, d }`) to the client.
 */
function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    // Prisma.Decimal instances expose toNumber()
    if (typeof (value as { toNumber?: () => number }).toNumber === "function") {
      return (value as { toNumber: () => number }).toNumber();
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serialize(v)]),
    );
  }
  return value;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => serialize(data)));
  }
}
