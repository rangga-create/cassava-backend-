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
import { ProductsService } from "./products.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard, Roles } from "../common/guards/roles.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/guards/roles.guard";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@ApiTags("products")
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Public endpoints — no auth required
  @Get("public")
  @ApiOperation({ summary: "List active products (public - no auth)" })
  findAllPublic(@Query() query: PaginationDto) {
    return this.productsService.findAllPublic(query);
  }

  @Get("public/:id")
  @ApiOperation({ summary: "Get product by ID (public - no auth)" })
  findOnePublic(@Param("id") id: string) {
    return this.productsService.findOnePublic(id);
  }

  // Authenticated endpoints
  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "List all products" })
  findAll(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.productsService.findAll(query, user);
  }

  @Get(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get product by ID" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.findOne(id, user);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create a new product" })
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.create(createProductDto, user);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update product" })
  update(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.update(id, updateProductDto, user);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Delete product" })
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.remove(id, user);
  }
}
