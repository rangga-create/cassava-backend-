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
import { CustomersService } from "./customers.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@ApiTags("customers")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: "List all customers" })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.customersService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get customer by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.customersService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({ summary: "Create a new customer" })
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.create(createCustomerDto, user);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({ summary: "Update customer" })
  update(
    @Param("id") id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.update(id, updateCustomerDto, user);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Delete customer" })
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.customersService.remove(id, user);
  }
}
