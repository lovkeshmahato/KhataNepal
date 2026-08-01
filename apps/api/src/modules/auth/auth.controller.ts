import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

const REFRESH_COOKIE = "khatanepal_refresh_token";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate with email/password and receive an access token" })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, req.ip);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate the refresh token and mint a new access token" })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE];
    const result = await this.authService.refresh(rawToken, req.ip);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke the current refresh token" })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE];
    await this.authService.logout(rawToken);
    res.clearCookie(REFRESH_COOKIE);
  }

  @Get("me")
  @ApiOperation({ summary: "Return the authenticated user's profile and permissions" })
  async me(@CurrentUser("id") userId: string) {
    return this.authService.me(userId);
  }

  private setRefreshCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get<string>("nodeEnv") === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/api/v1/auth",
    });
  }
}
