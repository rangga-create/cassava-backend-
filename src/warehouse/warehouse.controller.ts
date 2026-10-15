import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { WarehouseService } from "./warehouse.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import { UpdateWarehouseDto } from "./dto/update-warehouse.dto";

@ApiTags("warehouse")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("warehouses")
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get()
  @ApiOperation({ summary: "List all warehouses" })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.warehouseService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get warehouse by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.warehouseService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Create a new warehouse" })
  create(@Body() dto: CreateWarehouseDto, @CurrentUser() user: AuthUser) {
    return this.warehouseService.create(dto, user);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Update warehouse" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.warehouseService.update(id, dto, user);
  }

  @Get(":id/metrics")
  @ApiOperation({ summary: "Get warehouse metrics" })
  getMetrics(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.warehouseService.getMetrics(id, user);
  }
}
