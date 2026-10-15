import { Test, TestingModule } from "@nestjs/testing";
import { CustomersService } from "./customers.service";
import { FirebaseService } from "../common/services/firebase.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("CustomersService", () => {
  let service: CustomersService;

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
        CustomersService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated customers", async () => {
      const mockCustomers = [
        { id: "1", companyName: "China Foods", contactName: "Li Wei" },
        { id: "2", companyName: "Japan Starch", contactName: "Tanaka" },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockCustomers);

      const result = await service.findAll({ page: 1, limit: 10 }, mockUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should filter customers by search term", async () => {
      const mockCustomers = [
        { id: "1", companyName: "China Foods", contactName: "Li Wei" },
        { id: "2", companyName: "Japan Starch", contactName: "Tanaka" },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockCustomers);

      const result = await service.findAll(
        { page: 1, limit: 10, search: "china" },
        mockUser as any,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].companyName).toBe("China Foods");
    });
  });

  describe("findOne", () => {
    it("should return a customer by ID", async () => {
      const mockCustomer = { id: "1", companyName: "China Foods" };
      mockFirebaseService.getDocument.mockResolvedValue(mockCustomer);

      const result = await service.findOne("1", mockUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
    });

    it("should throw NotFoundException for non-existent customer", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.findOne("999", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("should create a new customer", async () => {
      const createDto = {
        companyName: "New Customer",
        contactName: "John Doe",
        email: "john@customer.com",
      };
      mockFirebaseService.createDocument.mockResolvedValue("new-customer-id");
      mockFirebaseService.getDocument.mockResolvedValue({
        id: "new-customer-id",
        ...createDto,
      });

      const result = await service.create(createDto as any, mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.createDocument).toHaveBeenCalled();

      const createCall = mockFirebaseService.createDocument.mock.calls[0];
      expect(createCall[1].companyId).toBe("company-123");
      expect(createCall[1].totalPurchase).toBe(0);
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
    it("should update a customer", async () => {
      const mockCustomer = { id: "1", companyName: "Old Name" };
      mockFirebaseService.getDocument.mockResolvedValue(mockCustomer);
      mockFirebaseService.updateDocument.mockResolvedValue(undefined);

      const result = await service.update(
        "1",
        { companyName: "New Name" } as any,
        mockUser as any,
      );

      expect(result.success).toBe(true);
      expect(mockFirebaseService.updateDocument).toHaveBeenCalled();
    });

    it("should throw NotFoundException for non-existent customer", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(
        service.update("999", { companyName: "Test" } as any, mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a customer", async () => {
      mockFirebaseService.getDocument.mockResolvedValue({ id: "1" });
      mockFirebaseService.deleteDocument.mockResolvedValue(undefined);

      const result = await service.remove("1", mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith("customers", "1");
    });

    it("should throw NotFoundException for non-existent customer", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.remove("999", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
