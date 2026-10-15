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
import { QualityControlService } from "./quality-control.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { CreateInspectionDto } from "./dto/create-inspection.dto";
import { UpdateInspectionDto } from "./dto/update-inspection.dto";

@ApiTags("quality-control")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("quality-inspections")
export class QualityControlController {
  constructor(private readonly qcService: QualityControlService) {}

  @Get()
  @ApiOperation({ summary: "List all quality inspections" })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.qcService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get quality inspection by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.qcService.findOne(id, user);
  }

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.QUALITY_CONTROL,
  )
  @ApiOperation({ summary: "Create quality inspection" })
  create(@Body() dto: CreateInspectionDto, @CurrentUser() user: AuthUser) {
    return this.qcService.create(dto, user);
  }

  @Patch(":id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.QUALITY_CONTROL,
  )
  @ApiOperation({ summary: "Update quality inspection" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateInspectionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.qcService.update(id, dto, user);
  }
}
