import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class CustomersService {
  private readonly COLLECTION = "customers";

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
      message: "Customers retrieved successfully",
    };
  }

  async findOne(id: string, user: AuthUser) {
    const customer = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return {
      success: true,
      data: customer,
      message: "Customer retrieved successfully",
    };
  }

  async create(createCustomerDto: CreateCustomerDto, user: AuthUser) {
    const companyId = user.companyId;

    if (!companyId && user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("You must belong to a company");
    }

    const customerId = await this.firebaseService.createDocument(
      this.COLLECTION,
      {
        ...createCustomerDto,
        companyId,
        totalPurchase: 0,
        outstanding: 0,
        profitability: 0,
        status: "ACTIVE",
      },
    );

    const customer = await this.firebaseService.getDocument(
      this.COLLECTION,
      customerId,
    );

    return {
      success: true,
      data: customer,
      message: "Customer created successfully",
    };
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    user: AuthUser,
  ) {
    const customer = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    await this.firebaseService.updateDocument(
      this.COLLECTION,
      id,
      updateCustomerDto,
    );

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: "Customer updated successfully",
    };
  }

  async remove(id: string, user: AuthUser) {
    const customer = await this.firebaseService.getDocument(
      this.COLLECTION,
      id,
    );

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    await this.firebaseService.deleteDocument(this.COLLECTION, id);

    return {
      success: true,
      data: null,
      message: "Customer deleted successfully",
    };
  }
}
