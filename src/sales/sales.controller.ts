import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { SalesService } from "./sales.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { CreateSalesOrderDto } from "./dto/create-sales-order.dto";
import { UpdateSalesOrderDto } from "./dto/update-sales-order.dto";

@ApiTags("sales")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("sales-orders")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: "List all sales orders" })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.salesService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get sales order by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.salesService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({ summary: "Create sales order" })
  create(@Body() dto: CreateSalesOrderDto, @CurrentUser() user: AuthUser) {
    return this.salesService.create(dto, user);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({ summary: "Update sales order" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateSalesOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.salesService.update(id, dto, user);
  }

  @Patch(":id/status")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({ summary: "Update sales order status" })
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.salesService.updateStatus(id, status, user);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Delete sales order" })
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.salesService.remove(id, user);
  }
}
