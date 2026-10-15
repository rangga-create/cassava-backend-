import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CompaniesService } from "./companies.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@ApiTags("companies")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "List all companies" })
  findAll(@CurrentUser() user: AuthUser) {
    return this.companiesService.findAll(user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get company by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.companiesService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Create a new company" })
  create(
    @Body() createCompanyDto: CreateCompanyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companiesService.create(createCompanyDto, user);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update company" })
  update(
    @Param("id") id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companiesService.update(id, updateCompanyDto, user);
  }
}
