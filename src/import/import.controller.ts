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
import { ImportService } from "./import.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { CreateImportOrderDto } from "./dto/create-import-order.dto";
import { UpdateImportOrderDto } from "./dto/update-import-order.dto";

@ApiTags("import")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("import-orders")
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Get()
  @ApiOperation({ summary: "List all import orders" })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.importService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get import order by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.importService.findOne(id, user);
  }

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.LOGISTICS,
  )
  @ApiOperation({ summary: "Create import order" })
  create(@Body() dto: CreateImportOrderDto, @CurrentUser() user: AuthUser) {
    return this.importService.create(dto, user);
  }

  @Patch(":id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.LOGISTICS,
  )
  @ApiOperation({ summary: "Update import order" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateImportOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.importService.update(id, dto, user);
  }

  @Patch(":id/status")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.LOGISTICS,
  )
  @ApiOperation({ summary: "Update import order status" })
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.importService.updateStatus(id, status, user);
  }
}
