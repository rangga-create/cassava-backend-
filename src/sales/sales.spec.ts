import { Test, TestingModule } from "@nestjs/testing";
import { SalesService } from "./sales.service";
import { FirebaseService } from "../common/services/firebase.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";

describe("SalesService", () => {
  let service: SalesService;
  let firebaseService: FirebaseService;

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
        SalesService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    firebaseService = module.get<FirebaseService>(FirebaseService);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated sales orders", async () => {
      const mockOrders = [
        { id: "1", soNumber: "SO-2026-0001", total: 50000 },
        { id: "2", soNumber: "SO-2026-0002", total: 30000 },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockOrders);

      const result = await service.findAll(
        { page: 1, limit: 10 },
        mockUser as any,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should filter by search term", async () => {
      const mockOrders = [
        { id: "1", soNumber: "SO-2026-0001", customerName: "Acme Corp" },
        { id: "2", soNumber: "SO-2026-0002", customerName: "Beta Inc" },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockOrders);

      const result = await service.findAll(
        { page: 1, limit: 10, search: "acme" },
        mockUser as any,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].customerName).toBe("Acme Corp");
    });
  });

  describe("findOne", () => {
    it("should return a sales order by ID", async () => {
      const mockOrder = { id: "1", soNumber: "SO-2026-0001" };
      mockFirebaseService.getDocument.mockResolvedValue(mockOrder);

      const result = await service.findOne("1", mockUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOrder);
    });

    it("should throw NotFoundException for non-existent order", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.findOne("999", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("should create a new sales order", async () => {
      const createDto = {
        customerId: "customer-1",
        productId: "product-1",
        quantity: 100,
        price: 500,
      };
      mockFirebaseService.createDocument.mockResolvedValue("new-order-id");
      mockFirebaseService.getDocument.mockResolvedValue({
        id: "new-order-id",
        ...createDto,
        total: 50000,
        soNumber: "SO-2026-0001",
      });

      const result = await service.create(createDto, mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.createDocument).toHaveBeenCalled();

      // Verify SO number and total calculation
      const createCall = mockFirebaseService.createDocument.mock.calls[0];
      expect(createCall[1].soNumber).toMatch(/^SO-\d{4}-/);
      expect(createCall[1].total).toBe(50000);
      expect(createCall[1].currency).toBe("USD");
    });
  });

  describe("updateStatus", () => {
    it("should update order status", async () => {
      const mockOrder = { id: "1", status: "DRAFT" };
      mockFirebaseService.getDocument.mockResolvedValue(mockOrder);
      mockFirebaseService.updateDocument.mockResolvedValue(undefined);

      const result = await service.updateStatus(
        "1",
        "CONFIRMED",
        mockUser as any,
      );

      expect(result.success).toBe(true);
      expect(mockFirebaseService.updateDocument).toHaveBeenCalledWith(
        "salesOrders",
        "1",
        { status: "CONFIRMED" },
      );
    });

    it("should throw BadRequestException for invalid status", async () => {
      const mockOrder = { id: "1", status: "DRAFT" };
      mockFirebaseService.getDocument.mockResolvedValue(mockOrder);

      await expect(
        service.updateStatus("1", "INVALID_STATUS", mockUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException for non-existent order", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(
        service.updateStatus("999", "CONFIRMED", mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a sales order", async () => {
      const mockOrder = { id: "1", soNumber: "SO-2026-0001" };
      mockFirebaseService.getDocument.mockResolvedValue(mockOrder);
      mockFirebaseService.deleteDocument.mockResolvedValue(undefined);

      const result = await service.remove("1", mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith(
        "salesOrders",
        "1",
      );
    });

    it("should throw NotFoundException for non-existent order", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.remove("999", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
