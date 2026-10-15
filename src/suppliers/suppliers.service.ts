import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class SuppliersService {
  private readonly COLLECTION = "suppliers";

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
          doc.companyName?.toLowerCase().includes(searchLower) ||
          doc.contactName?.toLowerCase().includes(searchLower),
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
      message: "Suppliers retrieved successfully",
    };
  }

  async findOne(id: string, user: AuthUser) {
    const supplier = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!supplier) {
      throw new NotFoundException("Supplier not found");
    }

    return {
      success: true,
      data: supplier,
      message: "Supplier retrieved successfully",
    };
  }

  async create(createSupplierDto: CreateSupplierDto, user: AuthUser) {
    const companyId = user.companyId;

    if (!companyId && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("You must belong to a company");
    }

    const supplierId = await this.firebaseService.createDocument(
      this.COLLECTION,
      {
        ...createSupplierDto,
        companyId,
        qualityScore: 0,
        reliabilityScore: 0,
        status: "ACTIVE",
      },
    );

    const supplier = await this.firebaseService.getDocument(
      this.COLLECTION,
      supplierId,
    );

    return {
      success: true,
      data: supplier,
      message: "Supplier created successfully",
    };
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
    user: AuthUser,
  ) {
    const supplier = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!supplier) {
      throw new NotFoundException("Supplier not found");
    }

    await this.firebaseService.updateDocument(
      this.COLLECTION,
      id,
      updateSupplierDto,
    );

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: "Supplier updated successfully",
    };
  }

  async remove(id: string, user: AuthUser) {
    const supplier = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!supplier) {
      throw new NotFoundException("Supplier not found");
    }

    await this.firebaseService.deleteDocument(this.COLLECTION, id);

    return {
      success: true,
      data: null,
      message: "Supplier deleted successfully",
    };
  }

  async getPerformance(id: string, user: AuthUser) {
    const supplier = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!supplier) {
      throw new NotFoundException("Supplier not found");
    }

    // In production, this would aggregate data from purchase orders and quality inspections
    const performance = {
      quality: supplier.qualityScore || 0,
      price: supplier.priceScore || 0,
      delivery: supplier.deliveryScore || 0,
      reliability: supplier.reliabilityScore || 0,
      consistency: supplier.consistencyScore || 0,
      overall:
        ((supplier.qualityScore || 0) +
          (supplier.priceScore || 0) +
          (supplier.deliveryScore || 0) +
          (supplier.reliabilityScore || 0) +
          (supplier.consistencyScore || 0)) /
        5,
    };

    return {
      success: true,
      data: performance,
      message: "Supplier performance retrieved successfully",
    };
  }
}
