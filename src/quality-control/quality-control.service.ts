import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class QualityControlService {
  private readonly COLLECTION = "qualityInspections";

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
          doc.batchNumber?.toLowerCase().includes(searchLower) ||
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
      message: "Quality inspections retrieved successfully",
    };
  }

  async findOne(id: string, user: AuthUser) {
    const inspection = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!inspection) {
      throw new NotFoundException("Quality inspection not found");
    }

    return {
      success: true,
      data: inspection,
      message: "Quality inspection retrieved successfully",
    };
  }

  async create(dto: any, user: AuthUser) {
    const companyId = user.companyId;

    if (!companyId && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("You must belong to a company");
    }

    // Calculate quality score
    const {
      moisture = 0,
      starchContent = 0,
      impurity = 0,
      damage = 0,
      freshness = 0,
    } = dto;

    const qualityScore = Math.round(
      starchContent * 0.3 +
        freshness * 0.25 +
        (100 - moisture) * 0.2 +
        (100 - impurity) * 0.15 +
        (100 - damage) * 0.1,
    );

    let result = "REJECTED";
    if (qualityScore >= 70) result = "APPROVED";
    else if (qualityScore >= 50) result = "CONDITIONAL";

    const inspectionId = await this.firebaseService.createDocument(
      this.COLLECTION,
      {
        ...dto,
        companyId,
        qualityScore,
        result,
        inspector: user.email,
      },
    );

    const inspection = await this.firebaseService.getDocument(
      this.COLLECTION,
      inspectionId,
    );

    return {
      success: true,
      data: inspection,
      message: "Quality inspection created successfully",
    };
  }

  async update(id: string, dto: any, user: AuthUser) {
    const inspection = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!inspection) {
      throw new NotFoundException("Quality inspection not found");
    }

    await this.firebaseService.updateDocument(this.COLLECTION, id, dto);

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: "Quality inspection updated successfully",
    };
  }
}
