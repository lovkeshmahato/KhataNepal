import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@khatanepal/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  findAll(@CurrentUser("orgId") orgId: string) {
    return this.usersService.findAll(orgId);
  }

  @Get("roles")
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  findRoles(@CurrentUser("orgId") orgId: string) {
    return this.usersService.findRoles(orgId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  findOne(@CurrentUser("orgId") orgId: string, @Param("id") id: string) {
    return this.usersService.findOne(orgId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  create(@CurrentUser("orgId") orgId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(orgId, dto);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  update(@CurrentUser("orgId") orgId: string, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(orgId, id, dto);
  }
}
