import { Test, TestingModule } from "@nestjs/testing";
import { CompaniesService } from "./companies.service";
import { FirebaseService } from "../common/services/firebase.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("CompaniesService", () => {
  let service: CompaniesService;

  const mockFirebaseService = {
    getDocuments: jest.fn(),
    getDocument: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
  };

  const mockUser = {
    uid: "user-123",
    email: "test@example.com",
    companyId: "company-123",
    role: "OWNER",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return all companies for SUPER_ADMIN", async () => {
      const adminUser = { ...mockUser, role: "SUPER_ADMIN" };
      const mockCompanies = [
        { id: "c1", name: "Company A" },
        { id: "c2", name: "Company B" },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockCompanies);

      const result = await service.findAll(adminUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it("should return own company for non-admin users", async () => {
      const mockCompany = { id: "company-123", name: "My Company" };
      mockFirebaseService.getDocument.mockResolvedValue(mockCompany);

      const result = await service.findAll(mockUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("company-123");
    });

    it("should return empty array if user has no company", async () => {
      const noCompanyUser = { ...mockUser, companyId: null };

      const result = await service.findAll(noCompanyUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return a company by ID", async () => {
      const mockCompany = { id: "company-123", name: "My Company" };
      mockFirebaseService.getDocument.mockResolvedValue(mockCompany);

      const result = await service.findOne("company-123", mockUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCompany);
    });

    it("should throw ForbiddenException when accessing other company", async () => {
      await expect(
        service.findOne("other-company", mockUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException for non-existent company", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.findOne("company-123", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("should create a new company", async () => {
      const createDto = { name: "New Company", industry: "Agriculture" };
      mockFirebaseService.createDocument.mockResolvedValue("new-company-id");
      mockFirebaseService.getDocument.mockResolvedValue({
        id: "new-company-id",
        ...createDto,
      });

      const result = await service.create(createDto as any, mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.createDocument).toHaveBeenCalled();

      const createCall = mockFirebaseService.createDocument.mock.calls[0];
      expect(createCall[1].ownerId).toBe("user-123");
      expect(createCall[1].status).toBe("ACTIVE");
    });
  });

  describe("update", () => {
    it("should update own company", async () => {
      const mockCompany = { id: "company-123", name: "Old Name" };
      mockFirebaseService.getDocument.mockResolvedValue(mockCompany);
      mockFirebaseService.updateDocument.mockResolvedValue(undefined);

      const result = await service.update(
        "company-123",
        { name: "New Name" } as any,
        mockUser as any,
      );

      expect(result.success).toBe(true);
      expect(mockFirebaseService.updateDocument).toHaveBeenCalled();
    });

    it("should throw ForbiddenException when updating other company", async () => {
      await expect(
        service.update("other-company", { name: "Hack" } as any, mockUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException for non-existent company", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(
        service.update("999", { name: "Test" } as any, mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
