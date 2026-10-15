import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { AuthGuard } from "../common/guards/auth.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("procurement")
  @ApiOperation({ summary: "Get procurement report" })
  getProcurement(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.reportsService.getProcurementReport(query, user);
  }

  @Get("inventory")
  @ApiOperation({ summary: "Get inventory report" })
  getInventory(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.reportsService.getInventoryReport(query, user);
  }

  @Get("quality")
  @ApiOperation({ summary: "Get quality report" })
  getQuality(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.reportsService.getQualityReport(query, user);
  }

  @Get("sales")
  @ApiOperation({ summary: "Get sales report" })
  getSales(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.reportsService.getSalesReport(query, user);
  }

  @Get("export")
  @ApiOperation({ summary: "Get export report" })
  getExport(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.reportsService.getExportReport(query, user);
  }

  @Get("import")
  @ApiOperation({ summary: "Get import report" })
  getImport(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.reportsService.getImportReport(query, user);
  }

  @Get("shipment")
  @ApiOperation({ summary: "Get shipment report" })
  getShipment(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.reportsService.getShipmentReport(query, user);
  }

  @Get("financial")
  @ApiOperation({ summary: "Get financial report" })
  getFinancial(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.reportsService.getFinancialReport(query, user);
  }

  @Get("profitability")
  @ApiOperation({ summary: "Get profitability report" })
  getProfitability(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.reportsService.getProfitabilityReport(query, user);
  }

  @Get("supplier")
  @ApiOperation({ summary: "Get supplier report" })
  getSupplier(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.reportsService.getSupplierReport(query, user);
  }

  @Get("customer")
  @ApiOperation({ summary: "Get customer report" })
  getCustomer(@Query() query: any, @CurrentUser() user: AuthUser) {
    return this.reportsService.getCustomerReport(query, user);
  }
}
