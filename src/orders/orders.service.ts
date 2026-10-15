import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreateOrderDto } from "./dto/create-order.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class OrdersService {
  private readonly COLLECTION = "orders";
  private readonly VALID_STATUSES = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "READY_TO_SHIP",
    "SHIPPED",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
  ];

  private readonly VALID_PAYMENT_STATUSES = [
    "UNPAID",
    "PARTIAL",
    "PAID",
    "REFUNDED",
  ];

  constructor(private readonly firebaseService: FirebaseService) {}

  async findAll(query: PaginationDto, user: AuthUser) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const filters: { field: string; operator: any; value: unknown }[] = [];

    // Customer can only see their own orders
    if (user.role === "CUSTOMER") {
      filters.push({
        field: "customerId",
        operator: "==",
        value: user.uid,
      });
    } else if (user.companyId) {
      filters.push({
        field: "companyId",
        operator: "==",
        value: user.companyId,
      });
    }

    const documents = await this.firebaseService.getDocuments(
      this.COLLECTION,
      filters.length > 0 ? filters : undefined,
      { field: sortBy, direction: sortOrder },
      limit * page,
    );

    let filteredDocs = documents;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDocs = documents.filter(
        (doc) =>
          doc.orderNumber?.toLowerCase().includes(searchLower) ||
          doc.customerName?.toLowerCase().includes(searchLower),
      );
    }

    const total = filteredDocs.length;
    const offset = (page - 1) * limit;
    const paginatedDocs = filteredDocs.slice(offset, offset + limit);

    return {
      success: true,
      data: paginatedDocs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      message: "Orders retrieved successfully",
    };
  }

  async findOne(id: string, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Customer can only see their own orders
    if (user.role === "CUSTOMER" && order.customerId !== user.uid) {
      throw new ForbiddenException("You can only access your own orders");
    }

    return {
      success: true,
      data: order,
      message: "Order retrieved successfully",
    };
  }

  async create(createOrderDto: CreateOrderDto, user: AuthUser) {
    // Generate order number
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-4);
    const orderNumber = `ORD-${year}-${timestamp}`;

    // Calculate totals
    const subtotal = createOrderDto.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
    const discount = createOrderDto.discount || 0;
    const tax = 0; // Tax can be calculated here if needed
    const grandTotal = subtotal - discount + tax;

    // Check stock for each item (optional - depends on business rules)
    for (const item of createOrderDto.items) {
      if (item.productId) {
        const inventory = await this.firebaseService.getDocuments("inventory", [
          { field: "productId", operator: "==", value: item.productId },
          { field: "companyId", operator: "==", value: user.companyId },
        ]);

        const availableStock = inventory.reduce(
          (sum, inv) => sum + (inv.availableQuantity || 0),
          0,
        );

        if (availableStock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${item.productName}. Only ${availableStock} items available.`,
          );
        }
      }
    }

    const orderData = {
      orderNumber,
      customerId: createOrderDto.customerId,
      customerName: createOrderDto.customerName,
      companyId: user.companyId,
      items: createOrderDto.items,
      subtotal,
      discount,
      tax,
      grandTotal,
      currency: "USD",
      shippingAddress: createOrderDto.shippingAddress,
      billingAddress: createOrderDto.billingAddress,
      contactPhone: createOrderDto.contactPhone,
      contactEmail: createOrderDto.contactEmail,
      notes: createOrderDto.notes,
      paymentMethod: createOrderDto.paymentMethod || "bank_transfer",
      paymentStatus: "UNPAID",
      shippingMethod: createOrderDto.shippingMethod,
      assignedSalesId: createOrderDto.assignedSalesId,
      status: "PENDING",
      statusHistory: [
        {
          status: "PENDING",
          timestamp: new Date().toISOString(),
          updatedBy: user.uid,
        },
      ],
    };

    const orderId = await this.firebaseService.createDocument(
      this.COLLECTION,
      orderData,
    );

    // Create notification for admin/manager/sales
    await this.firebaseService.createDocument("notifications", {
      userId: createOrderDto.assignedSalesId || "admin",
      type: "NEW_ORDER",
      title: "New Order Received",
      message: `Order ${orderNumber} from ${createOrderDto.customerName} - ${createOrderDto.items.length} item(s), Total: $${grandTotal.toFixed(2)}`,
      entityId: orderId,
      entityType: "order",
      read: false,
    });

    // Create notification for customer
    await this.firebaseService.createDocument("notifications", {
      userId: createOrderDto.customerId,
      type: "ORDER_CREATED",
      title: "Order Placed Successfully",
      message: `Your order ${orderNumber} has been placed successfully. We will process it shortly.`,
      entityId: orderId,
      entityType: "order",
      read: false,
    });

    const order = await this.firebaseService.getDocument(
      this.COLLECTION,
      orderId,
    );

    return {
      success: true,
      data: order,
      message: "Order created successfully",
    };
  }

  async updateStatus(
    id: string,
    status: string,
    user: AuthUser,
  ) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (!this.VALID_STATUSES.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    const statusHistory = order.statusHistory || [];
    statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      updatedBy: user.uid,
    });

    const updateData: any = { status, statusHistory };

    // Auto-set payment status for completed orders
    if (status === "COMPLETED") {
      updateData.paymentStatus = "PAID";
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, updateData);

    // Create notification for status change
    const statusMessages: Record<string, string> = {
      CONFIRMED: "Your order has been confirmed and is being processed.",
      PROCESSING: "Your order is now being processed.",
      READY_TO_SHIP: "Your order is ready to be shipped.",
      SHIPPED: "Your order has been shipped and is on its way.",
      DELIVERED: "Your order has been delivered.",
      COMPLETED: "Your order has been completed. Thank you!",
      CANCELLED: "Your order has been cancelled.",
    };

    if (statusMessages[status]) {
      await this.firebaseService.createDocument("notifications", {
        userId: order.customerId,
        type: "ORDER_STATUS_UPDATE",
        title: `Order ${order.orderNumber} - ${status.replace(/_/g, " ")}`,
        message: statusMessages[status],
        entityId: id,
        entityType: "order",
        read: false,
      });
    }

    const updated = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    return {
      success: true,
      data: updated,
      message: `Order status updated to ${status}`,
    };
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: string,
    user: AuthUser,
  ) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (!this.VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      throw new BadRequestException(`Invalid payment status: ${paymentStatus}`);
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, {
      paymentStatus,
    });

    const updated = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    return {
      success: true,
      data: updated,
      message: `Payment status updated to ${paymentStatus}`,
    };
  }

  async remove(id: string, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Only admin/owner can delete orders
    if (user.role !== "SUPER_ADMIN" && user.role !== "OWNER" && user.role !== "ADMIN") {
      throw new ForbiddenException("You don't have permission to delete orders");
    }

    // Soft delete - set status to CANCELLED
    await this.firebaseService.updateDocument(this.COLLECTION, id, {
      status: "CANCELLED",
      cancelledBy: user.uid,
      cancelledAt: new Date().toISOString(),
    });

    return {
      success: true,
      data: null,
      message: "Order cancelled successfully",
    };
  }
}
