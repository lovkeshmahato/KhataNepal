import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS, createCustomerSchema } from "@khatanepal/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CustomersService } from "./customers.service";

@ApiTags("customers")
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CUSTOMER_READ)
  findAll(@CurrentUser("orgId") orgId: string, @Query("search") search?: string) {
    return this.customersService.findAll(orgId, search);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.CUSTOMER_READ)
  findOne(@CurrentUser("orgId") orgId: string, @Param("id") id: string) {
    return this.customersService.findOne(orgId, id);
  }

  @Get(":id/purchase-history")
  @RequirePermissions(PERMISSIONS.CUSTOMER_READ)
  findPurchaseHistory(@CurrentUser("orgId") orgId: string, @Param("id") id: string) {
    return this.customersService.findPurchaseHistory(orgId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CUSTOMER_WRITE)
  create(@CurrentUser("orgId") orgId: string, @Body() body: unknown) {
    const dto = createCustomerSchema.parse(body);
    return this.customersService.create(orgId, dto);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.CUSTOMER_WRITE)
  update(@CurrentUser("orgId") orgId: string, @Param("id") id: string, @Body() body: unknown) {
    const dto = createCustomerSchema.partial().parse(body);
    return this.customersService.update(orgId, id, dto);
  }
}
