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
import { ExportService } from "./export.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { CreateExportOrderDto } from "./dto/create-export-order.dto";
import { UpdateExportOrderDto } from "./dto/update-export-order.dto";

@ApiTags("export")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("export-orders")
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  @ApiOperation({ summary: "List all export orders" })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.exportService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get export order by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.exportService.findOne(id, user);
  }

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.LOGISTICS,
  )
  @ApiOperation({ summary: "Create export order" })
  create(@Body() dto: CreateExportOrderDto, @CurrentUser() user: AuthUser) {
    return this.exportService.create(dto, user);
  }

  @Patch(":id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.LOGISTICS,
  )
  @ApiOperation({ summary: "Update export order" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateExportOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.exportService.update(id, dto, user);
  }

  @Patch(":id/status")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.LOGISTICS,
  )
  @ApiOperation({ summary: "Update export order status" })
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.exportService.updateStatus(id, status, user);
  }
}
