import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { FinanceService } from "./finance.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";

@ApiTags("finance")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("finance")
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("revenue")
  @ApiOperation({ summary: "Get revenue data" })
  getRevenue(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.financeService.getRevenue(query, user);
  }

  @Get("expenses")
  @ApiOperation({ summary: "Get expenses data" })
  getExpenses(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.financeService.getExpenses(query, user);
  }

  @Get("cash-flow")
  @ApiOperation({ summary: "Get cash flow data" })
  getCashFlow(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.financeService.getCashFlow(query, user);
  }

  @Get("profitability")
  @ApiOperation({ summary: "Get profitability data" })
  getProfitability(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.financeService.getProfitability(query, user);
  }
}
