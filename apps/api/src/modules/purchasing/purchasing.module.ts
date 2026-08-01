import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { AccountingModule } from "../accounting/accounting.module";
import { PurchasingController } from "./purchasing.controller";
import { SuppliersService } from "./suppliers.service";
import { PurchaseOrdersService } from "./purchase-orders.service";

@Module({
  imports: [InventoryModule, AccountingModule],
  controllers: [PurchasingController],
  providers: [SuppliersService, PurchaseOrdersService],
})
export class PurchasingModule {}
