import { Test, TestingModule } from "@nestjs/testing";
import { SuppliersService } from "./suppliers.service";
import { FirebaseService } from "../common/services/firebase.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("SuppliersService", () => {
  let service: SuppliersService;

  const mockFirebaseService = {
    getDocuments: jest.fn(),
    getDocument: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
  };

  const mockUser = {
    uid: "user-123",
    email: "test@example.com",
    companyId: "company-123",
    role: "ADMIN",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated suppliers", async () => {
      const mockSuppliers = [
        { id: "1", companyName: "Thai Cassava Corp", contactName: "Somchai" },
        { id: "2", companyName: "Vietnam Starch Ltd", contactName: "Nguyen" },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockSuppliers);

      const result = await service.findAll({ page: 1, limit: 10 }, mockUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should filter suppliers by search term", async () => {
      const mockSuppliers = [
        { id: "1", companyName: "Thai Cassava Corp", contactName: "Somchai" },
        { id: "2", companyName: "Vietnam Starch Ltd", contactName: "Nguyen" },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockSuppliers);

      const result = await service.findAll(
        { page: 1, limit: 10, search: "thai" },
        mockUser as any,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].companyName).toBe("Thai Cassava Corp");
    });
  });

  describe("findOne", () => {
    it("should return a supplier by ID", async () => {
      const mockSupplier = { id: "1", companyName: "Thai Cassava Corp" };
      mockFirebaseService.getDocument.mockResolvedValue(mockSupplier);

      const result = await service.findOne("1", mockUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSupplier);
    });

    it("should throw NotFoundException for non-existent supplier", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.findOne("999", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("should create a new supplier", async () => {
      const createDto = {
        companyName: "New Supplier",
        contactName: "Supplier Contact",
        email: "supplier@test.com",
      };
      mockFirebaseService.createDocument.mockResolvedValue("new-supplier-id");
      mockFirebaseService.getDocument.mockResolvedValue({
        id: "new-supplier-id",
        ...createDto,
      });

      const result = await service.create(createDto as any, mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.createDocument).toHaveBeenCalled();

      const createCall = mockFirebaseService.createDocument.mock.calls[0];
      expect(createCall[1].companyId).toBe("company-123");
      expect(createCall[1].qualityScore).toBe(0);
      expect(createCall[1].status).toBe("ACTIVE");
    });

    it("should throw ForbiddenException if user has no company", async () => {
      const createDto = { companyName: "Test", contactName: "Test" };

      await expect(
        service.create(createDto as any, { ...mockUser, companyId: null } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("update", () => {
    it("should update a supplier", async () => {
      const mockSupplier = { id: "1", companyName: "Old Name" };
      mockFirebaseService.getDocument.mockResolvedValue(mockSupplier);
      mockFirebaseService.updateDocument.mockResolvedValue(undefined);

      const result = await service.update(
        "1",
        { companyName: "New Name" } as any,
        mockUser as any,
      );

      expect(result.success).toBe(true);
      expect(mockFirebaseService.updateDocument).toHaveBeenCalled();
    });

    it("should throw NotFoundException for non-existent supplier", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(
        service.update("999", { companyName: "Test" } as any, mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a supplier", async () => {
      mockFirebaseService.getDocument.mockResolvedValue({ id: "1" });
      mockFirebaseService.deleteDocument.mockResolvedValue(undefined);

      const result = await service.remove("1", mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith("suppliers", "1");
    });

    it("should throw NotFoundException for non-existent supplier", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.remove("999", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getPerformance", () => {
    it("should return supplier performance metrics", async () => {
      const mockSupplier = {
        id: "1",
        qualityScore: 85,
        priceScore: 78,
        deliveryScore: 90,
        reliabilityScore: 88,
        consistencyScore: 82,
      };
      mockFirebaseService.getDocument.mockResolvedValue(mockSupplier);

      const result = await service.getPerformance("1", mockUser as any);

      expect(result.success).toBe(true);
      expect(result.data.quality).toBe(85);
      expect(result.data.delivery).toBe(90);
      expect(result.data.overall).toBe(84.6);
    });

    it("should throw NotFoundException for non-existent supplier", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.getPerformance("999", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
