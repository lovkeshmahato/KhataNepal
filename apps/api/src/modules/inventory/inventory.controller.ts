import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS, stockAdjustmentSchema } from "@khatanepal/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { InventoryService } from "./inventory.service";

@ApiTags("inventory")
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("stock")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  findStock(@CurrentUser("orgId") orgId: string, @Query("branchId") branchId?: string) {
    return this.inventoryService.findStockLevels(orgId, branchId);
  }

  @Get("stock/low")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  findLowStock(@CurrentUser("orgId") orgId: string, @Query("branchId") branchId?: string) {
    return this.inventoryService.findLowStock(orgId, branchId);
  }

  @Get("movements")
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  findMovements(
    @CurrentUser("orgId") orgId: string,
    @Query("branchId") branchId?: string,
    @Query("productId") productId?: string,
  ) {
    return this.inventoryService.findMovements(orgId, branchId, productId);
  }

  @Post("adjust")
  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  async adjust(@CurrentUser("orgId") orgId: string, @CurrentUser("id") userId: string, @Body() body: unknown) {
    const dto = stockAdjustmentSchema.parse(body);
    return this.inventoryService.adjustStock(orgId, userId, dto);
  }
}
