import { Test, TestingModule } from "@nestjs/testing";
import { ProcurementService } from "./procurement.service";
import { FirebaseService } from "../common/services/firebase.service";
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";

describe("ProcurementService", () => {
  let service: ProcurementService;

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
    role: "PROCUREMENT",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<ProcurementService>(ProcurementService);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated purchase orders", async () => {
      const mockOrders = [
        { id: "1", poNumber: "PO-2026-0001", total: 50000 },
        { id: "2", poNumber: "PO-2026-0002", total: 30000 },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockOrders);

      const result = await service.findAll({ page: 1, limit: 10 }, mockUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should filter by search term", async () => {
      const mockOrders = [
        { id: "1", poNumber: "PO-2026-0001", supplierName: "Thai Cassava" },
        { id: "2", poNumber: "PO-2026-0002", supplierName: "Vietnam Starch" },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockOrders);

      const result = await service.findAll(
        { page: 1, limit: 10, search: "thai" },
        mockUser as any,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].supplierName).toBe("Thai Cassava");
    });
  });

  describe("findOne", () => {
    it("should return a purchase order by ID", async () => {
      const mockOrder = { id: "1", poNumber: "PO-2026-0001" };
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
    it("should create a new purchase order", async () => {
      const createDto = {
        supplierId: "supplier-1",
        productId: "product-1",
        quantity: 100,
        price: 500,
      };
      mockFirebaseService.createDocument.mockResolvedValue("new-order-id");
      mockFirebaseService.getDocument.mockResolvedValue({
        id: "new-order-id",
        ...createDto,
      });

      const result = await service.create(createDto as any, mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.createDocument).toHaveBeenCalled();

      const createCall = mockFirebaseService.createDocument.mock.calls[0];
      expect(createCall[1].poNumber).toMatch(/^PO-\d{4}-/);
      expect(createCall[1].total).toBe(50000);
      expect(createCall[1].status).toBe("DRAFT");
    });

    it("should throw ForbiddenException if user has no company", async () => {
      const createDto = { supplierId: "s1", quantity: 100, price: 500 };

      await expect(
        service.create(createDto as any, { ...mockUser, companyId: null } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("updateStatus", () => {
    it("should update order status", async () => {
      const mockOrder = { id: "1", status: "DRAFT" };
      mockFirebaseService.getDocument.mockResolvedValue(mockOrder);
      mockFirebaseService.updateDocument.mockResolvedValue(undefined);

      const result = await service.updateStatus("1", "APPROVED", mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.updateDocument).toHaveBeenCalledWith(
        "purchaseOrders",
        "1",
        { status: "APPROVED" },
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
        service.updateStatus("999", "APPROVED", mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a purchase order", async () => {
      mockFirebaseService.getDocument.mockResolvedValue({ id: "1" });
      mockFirebaseService.deleteDocument.mockResolvedValue(undefined);

      const result = await service.remove("1", mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith("purchaseOrders", "1");
    });

    it("should throw NotFoundException for non-existent order", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.remove("999", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
