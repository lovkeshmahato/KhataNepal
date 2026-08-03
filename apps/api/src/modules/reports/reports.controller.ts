import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "../../shared-types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@Controller("reports")
@RequirePermissions(PERMISSIONS.REPORT_READ)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("dashboard")
  dashboard(@CurrentUser("orgId") orgId: string, @Query("branchId") branchId?: string) {
    return this.reportsService.dashboardOverview(orgId, branchId);
  }

  @Get("sales-summary")
  salesSummary(
    @CurrentUser("orgId") orgId: string,
    @Query("branchId") branchId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.reportsService.salesSummary(orgId, {
      branchId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get("vat")
  vatReport(
    @CurrentUser("orgId") orgId: string,
    @Query("branchId") branchId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.reportsService.vatReport(orgId, {
      branchId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get("top-products")
  topProducts(
    @CurrentUser("orgId") orgId: string,
    @Query("branchId") branchId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("limit") limit?: string,
  ) {
    return this.reportsService.topProducts(
      orgId,
      { branchId, from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined },
      limit ? Number(limit) : undefined,
    );
  }

  @Get("inventory-valuation")
  inventoryValuation(@CurrentUser("orgId") orgId: string, @Query("branchId") branchId?: string) {
    return this.reportsService.inventoryValuation(orgId, branchId);
  }
}
