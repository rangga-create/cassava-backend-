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
import { InventoryService } from "./inventory.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";

@ApiTags("inventory")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: "List all inventory items" })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.inventoryService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get inventory item by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.inventoryService.findOne(id, user);
  }

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.WAREHOUSE,
  )
  @ApiOperation({ summary: "Create inventory entry" })
  create(@Body() dto: CreateInventoryDto, @CurrentUser() user: AuthUser) {
    return this.inventoryService.create(dto, user);
  }

  @Patch(":id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.WAREHOUSE,
  )
  @ApiOperation({ summary: "Update inventory" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateInventoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.update(id, dto, user);
  }
}
