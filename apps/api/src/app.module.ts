import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import configuration from "./common/config/configuration";
import { PrismaModule } from "./common/prisma/prisma.module";
import { RedisModule } from "./common/redis/redis.module";
import { AuditModule } from "./common/audit/audit.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { AuditLogInterceptor } from "./common/interceptors/audit-log.interceptor";

import { HealthController } from "./modules/health/health.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { UsersModule } from "./modules/users/users.module";
import { ProductsModule } from "./modules/products/products.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { PurchasingModule } from "./modules/purchasing/purchasing.module";
import { SalesModule } from "./modules/sales/sales.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { AccountingModule } from "./modules/accounting/accounting.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AiInsightsModule } from "./modules/ai-insights/ai-insights.module";
import { PaymentsModule } from "./modules/payments/payments.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    RedisModule,
    AuditModule,
    AuthModule,
    OrganizationsModule,
    BranchesModule,
    UsersModule,
    ProductsModule,
    InventoryModule,
    PurchasingModule,
    SalesModule,
    CustomersModule,
    AccountingModule,
    ReportsModule,
    AiInsightsModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
