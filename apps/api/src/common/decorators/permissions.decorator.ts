import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@khatanepal/types";

export const PERMISSIONS_KEY = "permissions";

/** Requires the caller to hold ALL listed permissions. */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
