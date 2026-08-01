import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

/**
 * Thin wrapper around ioredis used for caching (dashboard aggregates,
 * report snapshots) and simple distributed locks (e.g. register session
 * open/close). Keeping this as an explicit service — rather than the
 * generic cache-manager abstraction — keeps key namespacing and TTLs
 * visible at the call site.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis(this.config.get<string>("redis.url")!, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
    this.client.on("error", (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length) await this.client.del(...keys);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
