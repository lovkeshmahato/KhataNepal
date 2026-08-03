import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { PERMISSIONS, createPurchaseOrderSchema, createSupplierSchema } from "../../shared-types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { SuppliersService } from "./suppliers.service";
import { PurchaseOrdersService } from "./purchase-orders.service";

class GoodsReceiptLineDto {
  @IsString()
  purchaseOrderLineId!: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;
}

class ReceiveGoodsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptLineDto)
  lines!: GoodsReceiptLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags("purchasing")
@Controller()
export class PurchasingController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  @Get("suppliers")
  @RequirePermissions(PERMISSIONS.SUPPLIER_MANAGE)
  findSuppliers(@CurrentUser("orgId") orgId: string) {
    return this.suppliersService.findAll(orgId);
  }

  @Post("suppliers")
  @RequirePermissions(PERMISSIONS.SUPPLIER_MANAGE)
  createSupplier(@CurrentUser("orgId") orgId: string, @Body() body: unknown) {
    const dto = createSupplierSchema.parse(body);
    return this.suppliersService.create(orgId, dto);
  }

  @Patch("suppliers/:id")
  @RequirePermissions(PERMISSIONS.SUPPLIER_MANAGE)
  updateSupplier(@CurrentUser("orgId") orgId: string, @Param("id") id: string, @Body() body: unknown) {
    const dto = createSupplierSchema.partial().parse(body);
    return this.suppliersService.update(orgId, id, dto);
  }

  @Get("purchase-orders")
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDER_READ)
  findPurchaseOrders(
    @CurrentUser("orgId") orgId: string,
    @Query("branchId") branchId?: string,
    @Query("status") status?: string,
  ) {
    return this.purchaseOrdersService.findAll(orgId, branchId, status);
  }

  @Get("purchase-orders/:id")
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDER_READ)
  findPurchaseOrder(@CurrentUser("orgId") orgId: string, @Param("id") id: string) {
    return this.purchaseOrdersService.findOne(orgId, id);
  }

  @Post("purchase-orders")
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDER_WRITE)
  createPurchaseOrder(
    @CurrentUser("orgId") orgId: string,
    @CurrentUser("id") userId: string,
    @Body() body: unknown,
  ) {
    const dto = createPurchaseOrderSchema.parse(body);
    return this.purchaseOrdersService.create(orgId, userId, dto);
  }

  @Post("purchase-orders/:id/receive")
  @RequirePermissions(PERMISSIONS.GOODS_RECEIPT_WRITE)
  receiveGoods(
    @CurrentUser("orgId") orgId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body() dto: ReceiveGoodsDto,
  ) {
    return this.purchaseOrdersService.receiveGoods(orgId, userId, id, dto.lines, dto.notes);
  }
}
