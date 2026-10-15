import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class CategoriesService {
  private readonly COLLECTION = "categories";

  constructor(private readonly firebaseService: FirebaseService) {}

  async findAll(query: PaginationDto, user: AuthUser) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "sortOrder",
      sortOrder = "asc",
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
      message: "Categories retrieved successfully",
    };
  }

  async findAllPublic() {
    const documents = await this.firebaseService.getDocuments(
      this.COLLECTION,
      [{ field: "status", operator: "==", value: "ACTIVE" }],
      { field: "sortOrder", direction: "asc" },
    );

    return {
      success: true,
      data: documents,
      message: "Categories retrieved successfully",
    };
  }

  async findOne(id: string) {
    const category = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return {
      success: true,
      data: category,
      message: "Category retrieved successfully",
    };
  }

  async create(createCategoryDto: CreateCategoryDto, user: AuthUser) {
    const companyId = user.companyId;

    if (!companyId && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("You must belong to a company");
    }

    const categoryId = await this.firebaseService.createDocument(
      this.COLLECTION,
      {
        ...createCategoryDto,
        companyId,
        productCount: 0,
        status: "ACTIVE",
        sortOrder: createCategoryDto.sortOrder || 0,
      },
    );

    const category = await this.firebaseService.getDocument(
      this.COLLECTION,
      categoryId,
    );

    return {
      success: true,
      data: category,
      message: "Category created successfully",
    };
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, user: AuthUser) {
    const category = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    await this.firebaseService.updateDocument(
      this.COLLECTION,
      id,
      updateCategoryDto,
    );

    const updated = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    return {
      success: true,
      data: updated,
      message: "Category updated successfully",
    };
  }

  async remove(id: string) {
    const category = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    await this.firebaseService.deleteDocument(this.COLLECTION, id);

    return {
      success: true,
      data: null,
      message: "Category deleted successfully",
    };
  }
}
