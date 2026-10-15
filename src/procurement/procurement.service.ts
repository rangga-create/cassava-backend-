import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class ProcurementService {
  private readonly COLLECTION = "purchaseOrders";

  private readonly VALID_STATUSES = [
    "DRAFT",
    "SUBMITTED",
    "APPROVED",
    "SUPPLIER_CONFIRMED",
    "IN_TRANSIT",
    "RECEIVED",
    "QUALITY_CONTROL",
    "COMPLETED",
    "CANCELLED",
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

    if (user.companyId) {
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
          doc.poNumber?.toLowerCase().includes(searchLower) ||
          doc.supplierName?.toLowerCase().includes(searchLower),
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
      message: "Purchase orders retrieved successfully",
    };
  }

  async findOne(id: string, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Purchase order not found");
    }

    return {
      success: true,
      data: order,
      message: "Purchase order retrieved successfully",
    };
  }

  async create(dto: CreatePurchaseOrderDto, user: AuthUser) {
    const companyId = user.companyId;

    if (!companyId && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("You must belong to a company");
    }

    // Generate PO number
    const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    const total = (dto.quantity || 0) * (dto.price || 0);

    const orderId = await this.firebaseService.createDocument(this.COLLECTION, {
      ...dto,
      companyId,
      poNumber,
      total,
      status: "DRAFT",
    });

    const order = await this.firebaseService.getDocument(
      this.COLLECTION,
      orderId,
    );

    return {
      success: true,
      data: order,
      message: "Purchase order created successfully",
    };
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Purchase order not found");
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, dto);

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: "Purchase order updated successfully",
    };
  }

  async updateStatus(id: string, status: string, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Purchase order not found");
    }

    if (!this.VALID_STATUSES.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, { status });

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: `Purchase order status updated to ${status}`,
    };
  }

  async remove(id: string, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Purchase order not found");
    }

    await this.firebaseService.deleteDocument(this.COLLECTION, id);

    return {
      success: true,
      data: null,
      message: "Purchase order deleted successfully",
    };
  }
}
