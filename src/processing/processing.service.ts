import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class ProcessingService {
  private readonly COLLECTION = "processingOrders";

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
        doc.rawMaterialName?.toLowerCase().includes(searchLower),
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
      message: "Processing orders retrieved successfully",
    };
  }

  async findOne(id: string, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Processing order not found");
    }

    return {
      success: true,
      data: order,
      message: "Processing order retrieved successfully",
    };
  }

  async create(dto: any, user: AuthUser) {
    const companyId = user.companyId;

    if (!companyId && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("You must belong to a company");
    }

    // Calculate yield and loss
    const inputQty = dto.inputQuantity || 0;
    const outputQty = dto.outputQuantity || 0;
    const loss = inputQty - outputQty;
    const yieldPercent = inputQty > 0 ? (outputQty / inputQty) * 100 : 0;

    const orderId = await this.firebaseService.createDocument(this.COLLECTION, {
      ...dto,
      companyId,
      rawMaterialName: dto.rawMaterialName || dto.rawMaterialId || "",
      loss,
      yield: Math.round(yieldPercent * 100) / 100,
      status: "PENDING",
    });

    const order = await this.firebaseService.getDocument(
      this.COLLECTION,
      orderId,
    );

    return {
      success: true,
      data: order,
      message: "Processing order created successfully",
    };
  }

  async update(id: string, dto: any, user: AuthUser) {
    const order = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!order) {
      throw new NotFoundException("Processing order not found");
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, dto);

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: "Processing order updated successfully",
    };
  }
}
