import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@khatanepal/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { BranchesService } from "./branches.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@ApiTags("branches")
@Controller("branches")
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  findAll(@CurrentUser("orgId") orgId: string) {
    return this.branchesService.findAll(orgId);
  }

  @Get(":id")
  findOne(@CurrentUser("orgId") orgId: string, @Param("id") id: string) {
    return this.branchesService.findOne(orgId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.BRANCH_MANAGE)
  create(@CurrentUser("orgId") orgId: string, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(orgId, dto);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.BRANCH_MANAGE)
  update(@CurrentUser("orgId") orgId: string, @Param("id") id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(orgId, id, dto);
  }
}
