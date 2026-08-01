import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { AccountingModule } from "../accounting/accounting.module";
import { SalesController } from "./sales.controller";
import { SalesService } from "./sales.service";
import { RegisterSessionsController } from "./register-sessions.controller";
import { RegisterSessionsService } from "./register-sessions.service";

@Module({
  imports: [InventoryModule, AccountingModule],
  controllers: [SalesController, RegisterSessionsController],
  providers: [SalesService, RegisterSessionsService],
  exports: [SalesService],
})
export class SalesModule {}
