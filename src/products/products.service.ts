import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { UploadService } from "../upload/upload.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class ProductsService {
  private readonly COLLECTION = "products";

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly uploadService: UploadService,
  ) {}

  async findAllPublic(query: PaginationDto) {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const filters: { field: string; operator: any; value: unknown }[] = [
      { field: "status", operator: "==", value: "ACTIVE" },
    ];

    const documents = await this.firebaseService.getDocuments(
      this.COLLECTION,
      filters,
      { field: sortBy, direction: sortOrder },
      limit * page,
    );

    let filteredDocs = documents;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDocs = documents.filter(
        (doc) =>
          doc.name?.toLowerCase().includes(searchLower) ||
          doc.description?.toLowerCase().includes(searchLower),
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
      message: "Products retrieved successfully",
    };
  }

  async findOnePublic(id: string) {
    const product = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return {
      success: true,
      data: product,
      message: "Product retrieved successfully",
    };
  }

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
          doc.name?.toLowerCase().includes(searchLower) ||
          doc.sku?.toLowerCase().includes(searchLower),
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
      message: "Products retrieved successfully",
    };
  }

  async findOne(id: string, user: AuthUser) {
    const product = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return {
      success: true,
      data: product,
      message: "Product retrieved successfully",
    };
  }

  async create(createProductDto: CreateProductDto, user: AuthUser) {
    const companyId = user.companyId;

    if (!companyId && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("You must belong to a company");
    }

    // Calculate margin
    const { purchaseCost, processingCost, sellingPrice } = createProductDto;
    const totalCost = (purchaseCost || 0) + (processingCost || 0);
    const margin =
      sellingPrice && totalCost
        ? ((sellingPrice - totalCost) / sellingPrice) * 100
        : 0;

    const productId = await this.firebaseService.createDocument(
      this.COLLECTION,
      {
        ...createProductDto,
        companyId,
        margin: Math.round(margin * 100) / 100,
        stock: 0,
        status: "ACTIVE",
      },
    );

    const product = await this.firebaseService.getDocument(
      this.COLLECTION,
      productId,
    );

    return {
      success: true,
      data: product,
      message: "Product created successfully",
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: AuthUser) {
    const product = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    await this.firebaseService.updateDocument(
      this.COLLECTION,
      id,
      updateProductDto,
    );

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: "Product updated successfully",
    };
  }

  async remove(id: string, user: AuthUser) {
    const product = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Delete image from Cloudinary if exists
    if (product.imagePublicId) {
      await this.uploadService.deleteImage(product.imagePublicId);
    }

    await this.firebaseService.deleteDocument(this.COLLECTION, id);

    return {
      success: true,
      data: null,
      message: "Product deleted successfully",
    };
  }
}
