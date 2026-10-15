import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class WarehouseService {
  private readonly COLLECTION = "warehouses";

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
      filteredDocs = documents.filter((doc) =>
        doc.name?.toLowerCase().includes(searchLower),
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
      message: "Warehouses retrieved successfully",
    };
  }

  async findOne(id: string, user: AuthUser) {
    const warehouse = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!warehouse) {
      throw new NotFoundException("Warehouse not found");
    }

    return {
      success: true,
      data: warehouse,
      message: "Warehouse retrieved successfully",
    };
  }

  async create(dto: any, user: AuthUser) {
    const companyId = user.companyId;

    if (!companyId && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("You must belong to a company");
    }

    const warehouseId = await this.firebaseService.createDocument(
      this.COLLECTION,
      {
        ...dto,
        companyId,
        occupied: 0,
        available: dto.capacity || 0,
        status: "ACTIVE",
      },
    );

    const warehouse = await this.firebaseService.getDocument(
      this.COLLECTION,
      warehouseId,
    );

    return {
      success: true,
      data: warehouse,
      message: "Warehouse created successfully",
    };
  }

  async update(id: string, dto: any, user: AuthUser) {
    const warehouse = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!warehouse) {
      throw new NotFoundException("Warehouse not found");
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, dto);

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: "Warehouse updated successfully",
    };
  }

  async getMetrics(id: string, user: AuthUser) {
    const warehouse = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!warehouse) {
      throw new NotFoundException("Warehouse not found");
    }

    const capacity = warehouse.capacity || 0;
    const occupied = warehouse.occupied || 0;
    const utilization = capacity > 0 ? (occupied / capacity) * 100 : 0;

    const metrics = {
      capacity,
      occupied,
      available: capacity - occupied,
      utilization: Math.round(utilization * 100) / 100,
      incoming: warehouse.incoming || 0,
      outgoing: warehouse.outgoing || 0,
    };

    return {
      success: true,
      data: metrics,
      message: "Warehouse metrics retrieved successfully",
    };
  }
}
