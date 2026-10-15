import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import { AuthGuard } from "../common/guards/auth.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";

@ApiTags("analytics")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Get dashboard analytics" })
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.analyticsService.getDashboard(user);
  }

  @Get("revenue-growth")
  @ApiOperation({ summary: "Get revenue growth analytics" })
  getRevenueGrowth(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.analyticsService.getRevenueGrowth(query, user);
  }

  @Get("volume-growth")
  @ApiOperation({ summary: "Get volume growth analytics" })
  getVolumeGrowth(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.analyticsService.getVolumeGrowth(query, user);
  }

  @Get("profit-growth")
  @ApiOperation({ summary: "Get profit growth analytics" })
  getProfitGrowth(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.analyticsService.getProfitGrowth(query, user);
  }
}
