import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class ImportService {
  private readonly COLLECTION = "importOrders";

  private readonly VALID_STATUSES = [
    "PREPARING",
    "SHIPPED",
    "IN_TRANSIT",
    "ARRIVED",
    "CUSTOMS",
    "DELIVERED",
    "COMPLETED",
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
          doc.supplierName?.toLowerCase().includes(searchLower) ||
          doc.country?.toLowerCase().includes(searchLower),
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
      message: "Import orders retrieved successfully",
    };
  }

  async findOne(id: string, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Import order not found");
    }

    return {
      success: true,
      data: order,
      message: "Import order retrieved successfully",
    };
  }

  async create(dto: any, user: AuthUser) {
    const companyId = user.companyId;

    if (!companyId && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("You must belong to a company");
    }

    // Calculate landed cost
    const purchaseValue = dto.purchaseValue || 0;
    const freight = dto.freight || 0;
    const insurance = dto.insurance || 0;
    const customs = dto.customs || 0;
    const tax = dto.tax || 0;
    const handling = dto.handling || 0;
    const landedCost =
      purchaseValue + freight + insurance + customs + tax + handling;

    const importId = await this.firebaseService.createDocument(
      this.COLLECTION,
      {
        ...dto,
        companyId,
        supplierName: dto.supplierName || dto.supplierId || "",
        landedCost,
        currency: dto.currency || "USD",
        status: "PREPARING",
      },
    );

    const order = await this.firebaseService.getDocument(
      this.COLLECTION,
      importId,
    );

    return {
      success: true,
      data: order,
      message: "Import order created successfully",
    };
  }

  async update(id: string, dto: any, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Import order not found");
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, dto);

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: "Import order updated successfully",
    };
  }

  async updateStatus(id: string, status: string, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Import order not found");
    }

    if (!this.VALID_STATUSES.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, { status });

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: `Import order status updated to ${status}`,
    };
  }
}
