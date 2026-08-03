import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "../../shared-types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AiInsightsService } from "./ai-insights.service";

@ApiTags("ai-insights")
@Controller("ai-insights")
@RequirePermissions(PERMISSIONS.AI_INSIGHTS_READ)
export class AiInsightsController {
  constructor(private readonly aiInsightsService: AiInsightsService) {}

  @Get("reorder-suggestions")
  reorderSuggestions(@CurrentUser("orgId") orgId: string, @Query("branchId") branchId?: string) {
    return this.aiInsightsService.reorderSuggestions(orgId, branchId);
  }

  @Get("sales-forecast")
  salesForecast(@CurrentUser("orgId") orgId: string, @Query("branchId") branchId?: string) {
    return this.aiInsightsService.salesForecast(orgId, branchId);
  }

  @Get("summary")
  summary(@CurrentUser("orgId") orgId: string, @Query("branchId") branchId?: string) {
    return this.aiInsightsService.narrativeSummary(orgId, branchId).then((summary) => ({ summary }));
  }
}
