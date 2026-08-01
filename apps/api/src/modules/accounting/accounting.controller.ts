import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@khatanepal/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AccountingService } from "./accounting.service";

@ApiTags("accounting")
@Controller("accounting")
@RequirePermissions(PERMISSIONS.ACCOUNTING_READ)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get("accounts")
  findAccounts(@CurrentUser("orgId") orgId: string) {
    return this.accountingService.findAccounts(orgId);
  }

  @Get("accounts/:id/ledger")
  findLedger(@CurrentUser("orgId") orgId: string, @Param("id") id: string) {
    return this.accountingService.findLedger(orgId, id);
  }

  @Get("journal-entries")
  findJournalEntries(@CurrentUser("orgId") orgId: string, @Query("branchId") branchId?: string) {
    return this.accountingService.findJournalEntries(orgId, branchId);
  }
}
