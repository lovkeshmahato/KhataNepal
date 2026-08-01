export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
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
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
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
