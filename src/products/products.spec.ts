import { Test, TestingModule } from "@nestjs/testing";
import { ProductsService } from "./products.service";
import { FirebaseService } from "../common/services/firebase.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("ProductsService", () => {
  let service: ProductsService;
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
        ProductsService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    firebaseService = module.get<FirebaseService>(FirebaseService);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated products", async () => {
      const mockProducts = [
        { id: "1", name: "Cassava Flour", sku: "CF-001" },
        { id: "2", name: "Cassava Chips", sku: "CC-001" },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockProducts);

      const result = await service.findAll(
        { page: 1, limit: 10 },
        mockUser as any,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should filter products by search term", async () => {
      const mockProducts = [
        { id: "1", name: "Cassava Flour", sku: "CF-001" },
        { id: "2", name: "Cassava Chips", sku: "CC-001" },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockProducts);

      const result = await service.findAll(
        { page: 1, limit: 10, search: "flour" },
        mockUser as any,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Cassava Flour");
    });
  });

  describe("findOne", () => {
    it("should return a product by ID", async () => {
      const mockProduct = { id: "1", name: "Cassava Flour" };
      mockFirebaseService.getDocument.mockResolvedValue(mockProduct);

      const result = await service.findOne("1", mockUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
    });

    it("should throw NotFoundException for non-existent product", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.findOne("999", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("should create a new product", async () => {
      const createDto = {
        sku: "CF-002",
        name: "New Cassava Flour",
        category: "FLOUR" as any,
        grade: "A",
        unit: "MT",
        sellingPrice: 500,
      };
      mockFirebaseService.createDocument.mockResolvedValue("new-id");
      mockFirebaseService.getDocument.mockResolvedValue({
        id: "new-id",
        ...createDto,
      });

      const result = await service.create(createDto, mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.createDocument).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if user has no company", async () => {
      const createDto = {
        sku: "CF-003",
        name: "Test Product",
        category: "FLOUR" as any,
        grade: "A",
        unit: "MT",
        sellingPrice: 500,
      };

      await expect(
        service.create(createDto, { ...mockUser, companyId: null } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should calculate margin correctly", async () => {
      const createDto = {
        sku: "CF-004",
        name: "Product with Margin",
        category: "FLOUR" as any,
        grade: "A",
        unit: "MT",
        purchaseCost: 300,
        processingCost: 50,
        sellingPrice: 500,
      };
      mockFirebaseService.createDocument.mockResolvedValue("new-id");
      mockFirebaseService.getDocument.mockResolvedValue({
        id: "new-id",
        ...createDto,
        margin: 30,
      });

      await service.create(createDto, mockUser as any);

      const createCall = mockFirebaseService.createDocument.mock.calls[0];
      expect(createCall[1].margin).toBe(30);
    });
  });

  describe("update", () => {
    it("should update a product", async () => {
      const mockProduct = { id: "1", name: "Old Name" };
      mockFirebaseService.getDocument.mockResolvedValue(mockProduct);
      mockFirebaseService.updateDocument.mockResolvedValue(undefined);
      mockFirebaseService.getDocument.mockResolvedValueOnce(mockProduct);
      mockFirebaseService.getDocument.mockResolvedValueOnce({
        id: "1",
        name: "New Name",
      });

      const result = await service.update(
        "1",
        { name: "New Name" },
        mockUser as any,
      );

      expect(result.success).toBe(true);
      expect(mockFirebaseService.updateDocument).toHaveBeenCalled();
    });

    it("should throw NotFoundException for non-existent product", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(
        service.update("999", { name: "Test" }, mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a product", async () => {
      const mockProduct = { id: "1", name: "Product" };
      mockFirebaseService.getDocument.mockResolvedValue(mockProduct);
      mockFirebaseService.deleteDocument.mockResolvedValue(undefined);

      const result = await service.remove("1", mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith(
        "products",
        "1",
      );
    });

    it("should throw NotFoundException for non-existent product", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.remove("999", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
