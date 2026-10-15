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
import { OrdersService } from "./orders.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { CreateOrderDto } from "./dto/create-order.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@ApiTags("orders")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "List all orders" })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.ordersService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: "Create a new order" })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Patch(":id/status")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SALES,
  )
  @ApiOperation({ summary: "Update order status" })
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.updateStatus(id, status, user);
  }

  @Patch(":id/payment")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.FINANCE,
  )
  @ApiOperation({ summary: "Update payment status" })
  updatePaymentStatus(
    @Param("id") id: string,
    @Body("paymentStatus") paymentStatus: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.updatePaymentStatus(id, paymentStatus, user);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Cancel order" })
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.remove(id, user);
  }
}
