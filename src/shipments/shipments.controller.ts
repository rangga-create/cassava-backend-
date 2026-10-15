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
import { ShipmentsService } from "./shipments.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { CreateShipmentDto } from "./dto/create-shipment.dto";
import { UpdateShipmentDto } from "./dto/update-shipment.dto";

@ApiTags("shipments")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("shipments")
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  @ApiOperation({ summary: "List all shipments" })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.shipmentsService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get shipment by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.shipmentsService.findOne(id, user);
  }

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.LOGISTICS,
  )
  @ApiOperation({ summary: "Create shipment" })
  create(@Body() dto: CreateShipmentDto, @CurrentUser() user: AuthUser) {
    return this.shipmentsService.create(dto, user);
  }

  @Patch(":id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.LOGISTICS,
  )
  @ApiOperation({ summary: "Update shipment" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateShipmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.shipmentsService.update(id, dto, user);
  }

  @Patch(":id/status")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.LOGISTICS,
  )
  @ApiOperation({ summary: "Update shipment status" })
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.shipmentsService.updateStatus(id, status, user);
  }
}
