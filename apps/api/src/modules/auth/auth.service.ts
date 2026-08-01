import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../../common/audit/audit.service";
import { loadAuthenticatedUser } from "./auth.util";
import type { LoginDto } from "./dto/login.dto";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const authUser = await loadAuthenticatedUser(this.prisma, user.id);
    const tokens = await this.issueTokenPair(user.id, ip);

    await this.auditService.record({
      orgId: user.orgId,
      userId: user.id,
      action: "auth.login",
      entityType: "User",
      entityId: user.id,
      ipAddress: ip,
    });

    return { user: authUser, ...tokens };
  }

  async refresh(rawRefreshToken: string, ip?: string) {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.config.get<string>("jwt.refreshSecret"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const candidates = await this.prisma.refreshToken.findMany({
      where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    let matched: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      if (await bcrypt.compare(rawRefreshToken, candidate.tokenHash)) {
        matched = candidate;
        break;
      }
    }
    if (!matched) throw new UnauthorizedException("Refresh token not recognized");

    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });

    const authUser = await loadAuthenticatedUser(this.prisma, payload.sub);
    if (!authUser) throw new UnauthorizedException("User no longer active");

    const tokens = await this.issueTokenPair(payload.sub, ip);
    return { user: authUser, ...tokens };
  }

  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) return;
    try {
      const payload = this.jwtService.verify<{ sub: string }>(rawRefreshToken, {
        secret: this.config.get<string>("jwt.refreshSecret"),
      });
      const candidates = await this.prisma.refreshToken.findMany({
        where: { userId: payload.sub, revokedAt: null },
      });
      for (const candidate of candidates) {
        if (await bcrypt.compare(rawRefreshToken, candidate.tokenHash)) {
          await this.prisma.refreshToken.update({
            where: { id: candidate.id },
            data: { revokedAt: new Date() },
          });
          break;
        }
      }
    } catch {
      // best-effort revoke; an already-invalid token needs no action
    }
  }

  async me(userId: string) {
    const authUser = await loadAuthenticatedUser(this.prisma, userId);
    if (!authUser) throw new UnauthorizedException();
    return authUser;
  }

  private async issueTokenPair(userId: string, ip?: string): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.config.get<string>("jwt.accessSecret"),
        expiresIn: this.config.get<string>("jwt.accessExpiresIn") as JwtSignOptions["expiresIn"],
      },
    );

    const refreshExpiresIn = this.config.get<string>("jwt.refreshExpiresIn")!;
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, jti: randomUUID() },
      {
        secret: this.config.get<string>("jwt.refreshSecret"),
        expiresIn: refreshExpiresIn as JwtSignOptions["expiresIn"],
      },
    );

    const expiresAt = new Date(Date.now() + parseDurationMs(refreshExpiresIn));
    const tokenHash = await bcrypt.hash(refreshToken, this.config.get<number>("bcryptSaltRounds")!);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt, createdByIp: ip },
    });

    return { accessToken, refreshToken, refreshTokenExpiresAt: expiresAt };
  }
}

/** Parses simple durations like "15m", "7d", "1h" into milliseconds. */
function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]]!;
  return value * unitMs;
}
