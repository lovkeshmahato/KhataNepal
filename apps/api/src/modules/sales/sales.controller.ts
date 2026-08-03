import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS, createSaleSchema } from "../../shared-types";
import { IsString, MinLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { SalesService } from "./sales.service";

class VoidSaleDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}

@ApiTags("sales")
@Controller("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SALE_READ)
  findAll(
    @CurrentUser("orgId") orgId: string,
    @Query("branchId") branchId?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.salesService.findAll(orgId, {
      branchId,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.SALE_READ)
  findOne(@CurrentUser("orgId") orgId: string, @Param("id") id: string) {
    return this.salesService.findOne(orgId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SALE_CREATE)
  create(@CurrentUser("orgId") orgId: string, @CurrentUser("id") userId: string, @Body() body: unknown) {
    const dto = createSaleSchema.parse(body);
    return this.salesService.createSale(orgId, userId, dto);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.SALE_VOID)
  void(
    @CurrentUser("orgId") orgId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body() dto: VoidSaleDto,
  ) {
    return this.salesService.voidSale(orgId, userId, id, dto.reason);
  }
}
