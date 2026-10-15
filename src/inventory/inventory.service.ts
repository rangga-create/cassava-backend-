import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class InventoryService {
  private readonly COLLECTION = "inventory";

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
          doc.productName?.toLowerCase().includes(searchLower) ||
          doc.batchNumber?.toLowerCase().includes(searchLower),
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
      message: "Inventory retrieved successfully",
    };
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!item) {
      throw new NotFoundException("Inventory item not found");
    }

    return {
      success: true,
      data: item,
      message: "Inventory item retrieved successfully",
    };
  }

  async create(dto: CreateInventoryDto, user: AuthUser) {
    const companyId = user.companyId;

    if (!companyId && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("You must belong to a company");
    }

    const itemId = await this.firebaseService.createDocument(this.COLLECTION, {
      ...dto,
      companyId,
      availableQuantity: (dto.quantity || 0) - (dto.reservedQuantity || 0),
      status: "AVAILABLE",
    });

    const item = await this.firebaseService.getDocument(
      this.COLLECTION,
      itemId,
    );

    return {
      success: true,
      data: item,
      message: "Inventory item created successfully",
    };
  }

  async update(id: string, dto: UpdateInventoryDto, user: AuthUser) {
    const item = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!item) {
      throw new NotFoundException("Inventory item not found");
    }

    // Recalculate availableQuantity if quantity or reservedQuantity changed
    const quantity = dto.quantity !== undefined ? dto.quantity : (item.quantity || 0);
    const reservedQuantity = dto.reservedQuantity !== undefined ? dto.reservedQuantity : (item.reservedQuantity || 0);
    const updateData: any = { ...dto, availableQuantity: quantity - reservedQuantity };

    await this.firebaseService.updateDocument(this.COLLECTION, id, updateData);

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: "Inventory item updated successfully",
    };
  }

  async remove(id: string, user: AuthUser) {
    const item = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!item) {
      throw new NotFoundException("Inventory item not found");
    }

    await this.firebaseService.deleteDocument(this.COLLECTION, id);

    return {
      success: true,
      data: null,
      message: "Inventory item deleted successfully",
    };
  }
}
