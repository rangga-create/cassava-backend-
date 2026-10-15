import { Test, TestingModule } from "@nestjs/testing";
import { InventoryService } from "./inventory.service";
import { FirebaseService } from "../common/services/firebase.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("InventoryService", () => {
  let service: InventoryService;
  let firebaseService: FirebaseService;

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
    role: "ADMIN",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    firebaseService = module.get<FirebaseService>(FirebaseService);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated inventory items", async () => {
      const mockItems = [
        { id: "1", productName: "Cassava Flour", quantity: 500 },
        { id: "2", productName: "Cassava Chips", quantity: 300 },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockItems);

      const result = await service.findAll(
        { page: 1, limit: 10 },
        mockUser as any,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should filter by search term", async () => {
      const mockItems = [
        { id: "1", productName: "Cassava Flour", batchNumber: "BATCH-001" },
        { id: "2", productName: "Cassava Chips", batchNumber: "BATCH-002" },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockItems);

      const result = await service.findAll(
        { page: 1, limit: 10, search: "flour" },
        mockUser as any,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].productName).toBe("Cassava Flour");
    });
  });

  describe("create", () => {
    it("should create a new inventory item", async () => {
      const createDto = {
        productId: "product-1",
        batchId: "batch-1",
        warehouseId: "warehouse-1",
        quantity: 500,
        unit: "MT",
        grade: "A",
      };
      mockFirebaseService.createDocument.mockResolvedValue("new-item-id");
      mockFirebaseService.getDocument.mockResolvedValue({
        id: "new-item-id",
        ...createDto,
        availableQuantity: 500,
        status: "AVAILABLE",
      });

      const result = await service.create(createDto, mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.createDocument).toHaveBeenCalled();

      // Verify available quantity calculation
      const createCall = mockFirebaseService.createDocument.mock.calls[0];
      expect(createCall[1].availableQuantity).toBe(500);
      expect(createCall[1].status).toBe("AVAILABLE");
    });

    it("should calculate available quantity correctly", async () => {
      const createDto = {
        productId: "product-1",
        batchId: "batch-1",
        warehouseId: "warehouse-1",
        quantity: 500,
        reservedQuantity: 100,
        unit: "MT",
        grade: "A",
      };
      mockFirebaseService.createDocument.mockResolvedValue("new-item-id");
      mockFirebaseService.getDocument.mockResolvedValue({
        id: "new-item-id",
        ...createDto,
      });

      await service.create(createDto, mockUser as any);

      const createCall = mockFirebaseService.createDocument.mock.calls[0];
      expect(createCall[1].availableQuantity).toBe(400);
    });

    it("should throw ForbiddenException if user has no company", async () => {
      const createDto = {
        productId: "product-1",
        batchId: "batch-1",
        warehouseId: "warehouse-1",
        quantity: 500,
        unit: "MT",
        grade: "A",
      };

      await expect(
        service.create(createDto, { ...mockUser, companyId: null } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("findOne", () => {
    it("should return an inventory item by ID", async () => {
      const mockItem = { id: "1", productName: "Cassava Flour" };
      mockFirebaseService.getDocument.mockResolvedValue(mockItem);

      const result = await service.findOne("1", mockUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItem);
    });

    it("should throw NotFoundException for non-existent item", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.findOne("999", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update an inventory item", async () => {
      const mockItem = { id: "1", quantity: 500 };
      mockFirebaseService.getDocument.mockResolvedValue(mockItem);
      mockFirebaseService.updateDocument.mockResolvedValue(undefined);

      const result = await service.update(
        "1",
        { quantity: 600 },
        mockUser as any,
      );

      expect(result.success).toBe(true);
      expect(mockFirebaseService.updateDocument).toHaveBeenCalled();
    });

    it("should throw NotFoundException for non-existent item", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(
        service.update("999", { quantity: 600 }, mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
