import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@Injectable()
export class CompaniesService {
  private readonly COLLECTION = "companies";

  constructor(private readonly firebaseService: FirebaseService) {}

  async findAll(user: AuthUser) {
    if (user.role === "SUPER_ADMIN") {
      const companies = await this.firebaseService.getDocuments(
        this.COLLECTION,
        undefined,
        { field: "createdAt", direction: "desc" },
      );
      return {
        success: true,
        data: companies,
        message: "Companies retrieved successfully",
      };
    }

    // Non-super-admin users can only see their own company
    if (user.companyId) {
      const company = await this.firebaseService.getDocument(
        this.COLLECTION,
        user.companyId,
      );
      return {
        success: true,
        data: company ? [company] : [],
        message: "Companies retrieved successfully",
      };
    }

    return {
      success: true,
      data: [],
      message: "No companies found",
    };
  }

  async findOne(id: string, user: AuthUser) {
    if (user.role !== "SUPER_ADMIN" && user.companyId !== id) {
      throw new ForbiddenException("You can only access your own company");
    }

    const company = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    return {
      success: true,
      data: company,
      message: "Company retrieved successfully",
    };
  }

  async create(createCompanyDto: CreateCompanyDto, user: AuthUser) {
    const companyId = await this.firebaseService.createDocument(
      this.COLLECTION,
      {
        ...createCompanyDto,
        status: "ACTIVE",
        ownerId: user.uid,
        members: { [user.uid]: "OWNER" },
      },
    );

    const company = await this.firebaseService.getDocument(
      this.COLLECTION,
      companyId,
    );

    return {
      success: true,
      data: company,
      message: "Company created successfully",
    };
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto, user: AuthUser) {
    const company = await this.firebaseService.getDocument(this.COLLECTION, id);

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    if (user.role !== "SUPER_ADMIN" && user.companyId !== id) {
      throw new ForbiddenException("You can only update your own company");
    }

    await this.firebaseService.updateDocument(
      this.COLLECTION,
      id,
      updateCompanyDto,
    );

    const updated = await this.firebaseService.getDocument(this.COLLECTION, id);

    return {
      success: true,
      data: updated,
      message: "Company updated successfully",
    };
  }
}
