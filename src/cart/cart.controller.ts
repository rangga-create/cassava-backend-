import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CartService } from "./cart.service";
import { AuthGuard } from "../common/guards/auth.guard";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { AddToCartDto, UpdateCartItemDto } from "./dto/cart-item.dto";

@ApiTags("cart")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: "Get current user's cart" })
  getCart(@CurrentUser() user: AuthUser) {
    return this.cartService.getCart(user);
  }

  @Post("items")
  @ApiOperation({ summary: "Add item to cart" })
  addToCart(
    @Body() addToCartDto: AddToCartDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cartService.addToCart(addToCartDto, user);
  }

  @Patch("items/:productId")
  @ApiOperation({ summary: "Update cart item quantity" })
  updateCartItem(
    @Param("productId") productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cartService.updateCartItem(productId, updateCartItemDto, user);
  }

  @Delete("items/:productId")
  @ApiOperation({ summary: "Remove item from cart" })
  removeFromCart(
    @Param("productId") productId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cartService.removeFromCart(productId, user);
  }

  @Delete()
  @ApiOperation({ summary: "Clear entire cart" })
  clearCart(@CurrentUser() user: AuthUser) {
    return this.cartService.clearCart(user);
  }
}
