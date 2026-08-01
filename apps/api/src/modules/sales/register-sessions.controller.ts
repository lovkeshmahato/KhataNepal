import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsNumber, IsString, Min } from "class-validator";
import { PERMISSIONS } from "@khatanepal/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { RegisterSessionsService } from "./register-sessions.service";

class OpenSessionDto {
  @IsString()
  registerId!: string;

  @IsNumber()
  @Min(0)
  openingCash!: number;
}

class CloseSessionDto {
  @IsNumber()
  @Min(0)
  closingCash!: number;
}

class CreateRegisterDto {
  @IsString()
  branchId!: string;

  @IsString()
  name!: string;
}

@ApiTags("register-sessions")
@Controller()
@RequirePermissions(PERMISSIONS.REGISTER_MANAGE)
export class RegisterSessionsController {
  constructor(private readonly registerSessionsService: RegisterSessionsService) {}

  @Get("registers")
  findRegisters(@CurrentUser("orgId") orgId: string, @Query("branchId") branchId?: string) {
    return this.registerSessionsService.findRegisters(orgId, branchId);
  }

  @Post("registers")
  createRegister(@Body() dto: CreateRegisterDto) {
    return this.registerSessionsService.createRegister(dto.branchId, dto.name);
  }

  @Get("register-sessions/active")
  findActive(@Query("branchId") branchId: string) {
    return this.registerSessionsService.findActive(branchId);
  }

  @Post("register-sessions/open")
  open(@CurrentUser("id") userId: string, @Body() dto: OpenSessionDto) {
    return this.registerSessionsService.open(userId, dto.registerId, dto.openingCash);
  }

  @Post("register-sessions/:id/close")
  close(@CurrentUser("id") userId: string, @Param("id") id: string, @Body() dto: CloseSessionDto) {
    return this.registerSessionsService.close(userId, id, dto.closingCash);
  }
}
