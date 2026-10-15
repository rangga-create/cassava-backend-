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
import { SuppliersService } from "./suppliers.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@ApiTags("suppliers")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: "List all suppliers" })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.suppliersService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get supplier by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.suppliersService.findOne(id, user);
  }

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.PROCUREMENT,
  )
  @ApiOperation({ summary: "Create a new supplier" })
  create(
    @Body() createSupplierDto: CreateSupplierDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliersService.create(createSupplierDto, user);
  }

  @Patch(":id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.PROCUREMENT,
  )
  @ApiOperation({ summary: "Update supplier" })
  update(
    @Param("id") id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliersService.update(id, updateSupplierDto, user);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Delete supplier" })
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.suppliersService.remove(id, user);
  }

  @Get(":id/performance")
  @ApiOperation({ summary: "Get supplier performance" })
  getPerformance(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.suppliersService.getPerformance(id, user);
  }
}
