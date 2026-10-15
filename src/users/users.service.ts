import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class UsersService {
  private readonly COLLECTION = "users";

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

    // Company-level data isolation
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
      limit * page, // Get enough for pagination
    );

    // Simple search filter (in production, use Algolia or similar)
    let filteredDocs = documents;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDocs = documents.filter(
        (doc) =>
          doc.name?.toLowerCase().includes(searchLower) ||
          doc.email?.toLowerCase().includes(searchLower),
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
      message: "Users retrieved successfully",
    };
  }

  async findOne(id: string, user: AuthUser) {
    const targetUser = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!targetUser) {
      throw new NotFoundException("User not found");
    }

    // Users can only see their own data unless they're admin/owner
    if (
      user.role !== "SUPER_ADMIN" &&
      user.role !== "OWNER" &&
      user.role !== "ADMIN" &&
      user.uid !== id
    ) {
      throw new ForbiddenException("You can only access your own profile");
    }

    return {
      success: true,
      data: targetUser,
      message: "User retrieved successfully",
    };
  }

  async create(createUserDto: CreateUserDto, user: AuthUser) {
    const companyId = user.companyId;

    if (!companyId && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("You must belong to a company");
    }

    const userId = await this.firebaseService.createDocument(this.COLLECTION, {
      ...createUserDto,
      companyId: companyId || null,
      status: "ACTIVE",
    });

    const newUser = await this.firebaseService.getDocument(
      this.COLLECTION,
      userId,
    );

    return {
      success: true,
      data: newUser,
      message: "User created successfully",
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto, user: AuthUser) {
    const targetUser = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!targetUser) {
      throw new NotFoundException("User not found");
    }

    // Only admins can update other users
    if (
      user.role !== "SUPER_ADMIN" &&
      user.role !== "OWNER" &&
      user.role !== "ADMIN" &&
      user.uid !== id
    ) {
      throw new ForbiddenException("You can only update your own profile");
    }

    await this.firebaseService.updateDocument(
      this.COLLECTION,
      id,
      updateUserDto,
    );

    const updatedUser = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    return {
      success: true,
      data: updatedUser,
      message: "User updated successfully",
    };
  }

  async remove(id: string, user: AuthUser) {
    const targetUser = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!targetUser) {
      throw new NotFoundException("User not found");
    }

    await this.firebaseService.deleteDocument(this.COLLECTION, id);

    return {
      success: true,
      data: null,
      message: "User deleted successfully",
    };
  }
}
