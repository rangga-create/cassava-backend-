import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { AddToCartDto, UpdateCartItemDto } from "./dto/cart-item.dto";

@Injectable()
export class CartService {
  private readonly COLLECTION = "carts";

  constructor(private readonly firebaseService: FirebaseService) {}

  async getCart(user: AuthUser) {
    // Get or create cart for user
    const carts = await this.firebaseService.getDocuments(this.COLLECTION, [
      { field: "userId", operator: "==", value: user.uid },
    ]);

    if (carts.length === 0) {
      // Create empty cart
      const cartId = await this.firebaseService.createDocument(this.COLLECTION, {
        userId: user.uid,
        companyId: user.companyId,
        items: [],
        totalItems: 0,
        totalAmount: 0,
      });

      const cart = await this.firebaseService.getDocument(this.COLLECTION, cartId);
      return {
        success: true,
        data: cart,
        message: "Cart retrieved successfully",
      };
    }

    return {
      success: true,
      data: carts[0],
      message: "Cart retrieved successfully",
    };
  }

  async addToCart(addToCartDto: AddToCartDto, user: AuthUser) {
    // Get existing cart
    const carts = await this.firebaseService.getDocuments(this.COLLECTION, [
      { field: "userId", operator: "==", value: user.uid },
    ]);

    let cart;
    let cartId: string;

    if (carts.length === 0) {
      // Create new cart
      cartId = await this.firebaseService.createDocument(this.COLLECTION, {
        userId: user.uid,
        companyId: user.companyId,
        items: [],
        totalItems: 0,
        totalAmount: 0,
      });
      cart = await this.firebaseService.getDocument(this.COLLECTION, cartId);
    } else {
      cart = carts[0];
      cartId = cart.id;
    }

    // Check if product already in cart
    const items = cart.items || [];
    const existingIndex = items.findIndex(
      (item: any) => item.productId === addToCartDto.productId,
    );

    if (existingIndex >= 0) {
      // Update quantity
      items[existingIndex].quantity += addToCartDto.quantity;
    } else {
      // Add new item
      items.push({
        productId: addToCartDto.productId,
        productName: addToCartDto.productName || "Unknown Product",
        imageUrl: addToCartDto.imageUrl,
        price: addToCartDto.price || 0,
        quantity: addToCartDto.quantity,
      });
    }

    // Recalculate totals
    const totalItems = items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0,
    );
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.price,
      0,
    );

    await this.firebaseService.updateDocument(this.COLLECTION, cartId, {
      items,
      totalItems,
      totalAmount,
      updatedAt: new Date().toISOString(),
    });

    const updatedCart = await this.firebaseService.getDocument(
      this.COLLECTION,
      cartId,
    );

    return {
      success: true,
      data: updatedCart,
      message: "Item added to cart successfully",
    };
  }

  async updateCartItem(
    productId: string,
    updateCartItemDto: UpdateCartItemDto,
    user: AuthUser,
  ) {
    const carts = await this.firebaseService.getDocuments(this.COLLECTION, [
      { field: "userId", operator: "==", value: user.uid },
    ]);

    if (carts.length === 0) {
      throw new NotFoundException("Cart not found");
    }

    const cart = carts[0];
    const items = cart.items || [];
    const itemIndex = items.findIndex(
      (item: any) => item.productId === productId,
    );

    if (itemIndex < 0) {
      throw new NotFoundException("Item not found in cart");
    }

    items[itemIndex].quantity = updateCartItemDto.quantity;

    // Recalculate totals
    const totalItems = items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0,
    );
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.price,
      0,
    );

    await this.firebaseService.updateDocument(this.COLLECTION, cart.id, {
      items,
      totalItems,
      totalAmount,
      updatedAt: new Date().toISOString(),
    });

    const updatedCart = await this.firebaseService.getDocument(
      this.COLLECTION,
      cart.id,
    );

    return {
      success: true,
      data: updatedCart,
      message: "Cart updated successfully",
    };
  }

  async removeFromCart(productId: string, user: AuthUser) {
    const carts = await this.firebaseService.getDocuments(this.COLLECTION, [
      { field: "userId", operator: "==", value: user.uid },
    ]);

    if (carts.length === 0) {
      throw new NotFoundException("Cart not found");
    }

    const cart = carts[0];
    const items = (cart.items || []).filter(
      (item: any) => item.productId !== productId,
    );

    // Recalculate totals
    const totalItems = items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0,
    );
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.price,
      0,
    );

    await this.firebaseService.updateDocument(this.COLLECTION, cart.id, {
      items,
      totalItems,
      totalAmount,
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      data: { items, totalItems, totalAmount },
      message: "Item removed from cart successfully",
    };
  }

  async clearCart(user: AuthUser) {
    const carts = await this.firebaseService.getDocuments(this.COLLECTION, [
      { field: "userId", operator: "==", value: user.uid },
    ]);

    if (carts.length > 0) {
      await this.firebaseService.updateDocument(this.COLLECTION, carts[0].id, {
        items: [],
        totalItems: 0,
        totalAmount: 0,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      success: true,
      data: { items: [], totalItems: 0, totalAmount: 0 },
      message: "Cart cleared successfully",
    };
  }
}
