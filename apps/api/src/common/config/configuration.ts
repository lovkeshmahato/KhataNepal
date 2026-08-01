export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  cookieSameSite: "lax" | "none" | "strict";
  database: { url: string };
  redis: { url: string };
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  bcryptSaltRounds: number;
  payments: {
    esewa: { merchantCode: string; secretKey: string; mode: string };
    khalti: { publicKey: string; secretKey: string; mode: string };
  };
  aiInsights: { provider: string; anthropicApiKey?: string };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.API_PORT ?? "4000", 10),
  apiPrefix: process.env.API_PREFIX ?? "api/v1",
  // Comma-separated list — needed because a Vercel-hosted frontend (or any
  // frontend on a different domain than this API) makes cross-site
  // requests, and CORS only allows origins explicitly listed here.
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // "lax" only works when the frontend and this API share the same
  // registrable domain (e.g. both on localhost, or same-site subdomains).
  // A split deployment (e.g. frontend on Vercel, API elsewhere) is
  // cross-site, so the refresh-token cookie needs SameSite=None — which
  // browsers only honor when the cookie is also Secure (HTTPS). Set
  // COOKIE_SAME_SITE=none once the API is served over HTTPS.
  cookieSameSite: (process.env.COOKIE_SAME_SITE as "lax" | "none" | "strict" | undefined) ?? "lax",
  database: {
    url: process.env.DATABASE_URL ?? "",
  },
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me-please-32chars",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me-please-32chars",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? "12", 10),
  payments: {
    esewa: {
      merchantCode: process.env.ESEWA_MERCHANT_CODE ?? "",
      secretKey: process.env.ESEWA_SECRET_KEY ?? "",
      mode: process.env.ESEWA_MODE ?? "sandbox",
    },
    khalti: {
      publicKey: process.env.KHALTI_PUBLIC_KEY ?? "",
      secretKey: process.env.KHALTI_SECRET_KEY ?? "",
      mode: process.env.KHALTI_MODE ?? "sandbox",
    },
  },
  aiInsights: {
    provider: process.env.AI_INSIGHTS_PROVIDER ?? "heuristic",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  },
});
