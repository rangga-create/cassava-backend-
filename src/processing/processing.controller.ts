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
import { ProcessingService } from "./processing.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { CreateProcessingOrderDto } from "./dto/create-processing-order.dto";
import { UpdateProcessingOrderDto } from "./dto/update-processing-order.dto";

@ApiTags("processing")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("processing-orders")
export class ProcessingController {
  constructor(private readonly processingService: ProcessingService) {}

  @Get()
  @ApiOperation({ summary: "List all processing orders" })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.processingService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get processing order by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.processingService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create processing order" })
  create(@Body() dto: CreateProcessingOrderDto, @CurrentUser() user: AuthUser) {
    return this.processingService.create(dto, user);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update processing order" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProcessingOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.processingService.update(id, dto, user);
  }
}
