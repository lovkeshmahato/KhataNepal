import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";

/** Loads a user with roles/branches and flattens them into request-scoped auth context. */
export async function loadAuthenticatedUser(
  prisma: PrismaService,
  userId: string,
): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: { include: { role: true } },
      branches: { select: { branchId: true } },
    },
  });
  if (!user || !user.isActive) return null;

  const permissions = new Set<string>();
  for (const ur of user.roles) {
    const perms = (ur.role.permissions as string[]) ?? [];
    perms.forEach((p) => permissions.add(p));
  }

  return {
    id: user.id,
    orgId: user.orgId,
    email: user.email,
    fullName: user.fullName,
    permissions: Array.from(permissions),
    branchIds: user.branches.map((b) => b.branchId),
  };
}
