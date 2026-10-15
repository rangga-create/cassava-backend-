import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { FirebaseService } from "../common/services/firebase.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("UsersService", () => {
  let service: UsersService;

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
        UsersService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated users", async () => {
      const mockUsers = [
        { id: "1", name: "Admin", email: "admin@test.com" },
        { id: "2", name: "Manager", email: "manager@test.com" },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockUsers);

      const result = await service.findAll({ page: 1, limit: 10 }, mockUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should filter users by search term", async () => {
      const mockUsers = [
        { id: "1", name: "Admin User", email: "admin@test.com" },
        { id: "2", name: "Manager User", email: "manager@test.com" },
      ];
      mockFirebaseService.getDocuments.mockResolvedValue(mockUsers);

      const result = await service.findAll(
        { page: 1, limit: 10, search: "admin" },
        mockUser as any,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Admin User");
    });
  });

  describe("findOne", () => {
    it("should return a user by ID for admin", async () => {
      const mockTargetUser = { id: "user-456", name: "Other User" };
      mockFirebaseService.getDocument.mockResolvedValue(mockTargetUser);

      const result = await service.findOne("user-456", mockUser as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTargetUser);
    });

    it("should return own user profile", async () => {
      const mockSelf = { id: "user-123", name: "Test User" };
      mockFirebaseService.getDocument.mockResolvedValue(mockSelf);

      const result = await service.findOne("user-123", mockUser as any);

      expect(result.success).toBe(true);
    });

    it("should throw ForbiddenException when non-admin accesses other user", async () => {
      const viewerUser = { ...mockUser, role: "VIEWER" };
      mockFirebaseService.getDocument.mockResolvedValue({ id: "user-456" });

      await expect(service.findOne("user-456", viewerUser as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException for non-existent user", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.findOne("999", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("should create a new user", async () => {
      const createDto = { name: "New User", email: "new@test.com", role: "SALES" };
      mockFirebaseService.createDocument.mockResolvedValue("new-user-id");
      mockFirebaseService.getDocument.mockResolvedValue({
        id: "new-user-id",
        ...createDto,
      });

      const result = await service.create(createDto as any, mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.createDocument).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if user has no company", async () => {
      const createDto = { name: "New User", email: "new@test.com" };

      await expect(
        service.create(createDto as any, { ...mockUser, companyId: null } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("update", () => {
    it("should update a user", async () => {
      const mockTargetUser = { id: "user-123", name: "Old Name" };
      mockFirebaseService.getDocument.mockResolvedValue(mockTargetUser);
      mockFirebaseService.updateDocument.mockResolvedValue(undefined);

      const result = await service.update("user-123", { name: "New Name" } as any, mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.updateDocument).toHaveBeenCalled();
    });

    it("should throw NotFoundException for non-existent user", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(
        service.update("999", { name: "Test" } as any, mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a user", async () => {
      mockFirebaseService.getDocument.mockResolvedValue({ id: "user-456" });
      mockFirebaseService.deleteDocument.mockResolvedValue(undefined);

      const result = await service.remove("user-456", mockUser as any);

      expect(result.success).toBe(true);
      expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith("users", "user-456");
    });

    it("should throw NotFoundException for non-existent user", async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      await expect(service.remove("999", mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
