import { ConfigService } from "@nestjs/config";
import { createApp } from "./create-app";

async function bootstrap() {
  const app = await createApp();
  const config = app.get(ConfigService);

  const apiPrefix = config.get<string>("apiPrefix")!;
  const port = config.get<number>("port")!;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`KhataNepal API listening on :${port}/${apiPrefix} (docs at /${apiPrefix}/docs)`);
}

bootstrap();
