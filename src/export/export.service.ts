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
export class ExportService {
  private readonly COLLECTION = "exportOrders";

  private readonly VALID_STATUSES = [
    "PREPARING",
    "DOCUMENTATION",
    "CUSTOMS",
    "LOADED",
    "IN_TRANSIT",
    "ARRIVED",
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
          doc.buyerName?.toLowerCase().includes(searchLower) ||
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
      message: "Export orders retrieved successfully",
    };
  }

  async findOne(id: string, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Export order not found");
    }

    return {
      success: true,
      data: order,
      message: "Export order retrieved successfully",
    };
  }

  async create(dto: any, user: AuthUser) {
    const companyId = user.companyId;

    if (!companyId && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("You must belong to a company");
    }

    const exportId = await this.firebaseService.createDocument(
      this.COLLECTION,
      {
        ...dto,
        companyId,
        buyerName: dto.buyerName || dto.buyerId || "",
        status: "PREPARING",
      },
    );

    const order = await this.firebaseService.getDocument(
      this.COLLECTION,
      exportId,
    );

    return {
      success: true,
      data: order,
      message: "Export order created successfully",
    };
  }

  async update(id: string, dto: any, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Export order not found");
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, dto);

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: "Export order updated successfully",
    };
  }

  async updateStatus(id: string, status: string, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Export order not found");
    }

    if (!this.VALID_STATUSES.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, { status });

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: `Export order status updated to ${status}`,
    };
  }
}
