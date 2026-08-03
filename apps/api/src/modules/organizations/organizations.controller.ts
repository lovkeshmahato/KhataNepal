import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "../../shared-types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { OrganizationsService } from "./organizations.service";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

@ApiTags("organizations")
@Controller("organization")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  getCurrent(@CurrentUser("orgId") orgId: string) {
    return this.organizationsService.getCurrent(orgId);
  }

  @Patch()
  @RequirePermissions(PERMISSIONS.ORG_MANAGE)
  update(@CurrentUser("orgId") orgId: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(orgId, dto);
  }
}
