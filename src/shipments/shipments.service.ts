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
export class ShipmentsService {
  private readonly COLLECTION = "shipments";

  private readonly VALID_STATUSES = [
    "PREPARING",
    "LOADED",
    "DEPARTED",
    "IN_TRANSIT",
    "ARRIVED",
    "DELIVERED",
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
          doc.container?.toLowerCase().includes(searchLower) ||
          doc.carrier?.toLowerCase().includes(searchLower),
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
      message: "Shipments retrieved successfully",
    };
  }

  async findOne(id: string, user: AuthUser) {
    const shipment = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!shipment) {
      throw new NotFoundException("Shipment not found");
    }

    return {
      success: true,
      data: shipment,
      message: "Shipment retrieved successfully",
    };
  }

  async create(dto: any, user: AuthUser) {
    const companyId = user.companyId;

    if (!companyId && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("You must belong to a company");
    }

    const shipmentId = await this.firebaseService.createDocument(
      this.COLLECTION,
      {
        ...dto,
        companyId,
        productName: dto.productName || dto.productId || "",
        status: "PREPARING",
      },
    );

    const shipment = await this.firebaseService.getDocument(
      this.COLLECTION,
      shipmentId,
    );

    return {
      success: true,
      data: shipment,
      message: "Shipment created successfully",
    };
  }

  async update(id: string, dto: any, user: AuthUser) {
    const shipment = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!shipment) {
      throw new NotFoundException("Shipment not found");
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, dto);

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: "Shipment updated successfully",
    };
  }

  async updateStatus(id: string, status: string, user: AuthUser) {
    const shipment = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!shipment) {
      throw new NotFoundException("Shipment not found");
    }

    if (!this.VALID_STATUSES.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    const updateData: any = { status };
    if (status === "DELIVERED") {
      updateData.actualArrival = new Date().toISOString();
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, updateData);

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: `Shipment status updated to ${status}`,
    };
  }
}
