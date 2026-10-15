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
import { ProcurementService } from "./procurement.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@ApiTags("procurement")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("purchase-orders")
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Get()
  @ApiOperation({ summary: "List all purchase orders" })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.procurementService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get purchase order by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.procurementService.findOne(id, user);
  }

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.PROCUREMENT,
  )
  @ApiOperation({ summary: "Create a new purchase order" })
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.procurementService.create(dto, user);
  }

  @Patch(":id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.PROCUREMENT,
  )
  @ApiOperation({ summary: "Update purchase order" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.procurementService.update(id, dto, user);
  }

  @Patch(":id/status")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.PROCUREMENT,
  )
  @ApiOperation({ summary: "Update purchase order status" })
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.procurementService.updateStatus(id, status, user);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Delete purchase order" })
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.procurementService.remove(id, user);
  }
}
