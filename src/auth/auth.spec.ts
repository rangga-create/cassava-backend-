import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { FirebaseService } from "../common/services/firebase.service";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException, ConflictException } from "@nestjs/common";

describe("AuthService", () => {
  let service: AuthService;
  let firebaseService: FirebaseService;

  const mockFirebaseService = {
    getAuth: jest.fn(),
    getFirestore: jest.fn(),
    getDocument: jest.fn(),
    createDocument: jest.fn(),
    isFirebaseReady: jest.fn().mockReturnValue(true),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAuth = {
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
    createCustomToken: jest.fn(),
    revokeRefreshTokens: jest.fn(),
  };

  const mockFirestore = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    firebaseService = module.get<FirebaseService>(FirebaseService);

    mockFirebaseService.getAuth.mockReturnValue(mockAuth);
    mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user", async () => {
      mockAuth.getUserByEmail.mockRejectedValue(new Error("User not found"));
      mockAuth.createUser.mockResolvedValue({
        uid: "new-user-123",
        email: "new@example.com",
        displayName: "New User",
      });
      mockAuth.createCustomToken.mockResolvedValue("custom-token-123");

      const result = await service.register({
        email: "new@example.com",
        password: "Password123",
        name: "New User",
      });

      expect(result.success).toBe(true);
      expect(result.data.uid).toBe("new-user-123");
      expect(result.data.token).toBe("custom-token-123");
      expect(mockAuth.createUser).toHaveBeenCalled();
    });

    it("should throw ConflictException if user already exists", async () => {
      mockAuth.getUserByEmail.mockResolvedValue({ uid: "existing-user" });

      await expect(
        service.register({
          email: "existing@example.com",
          password: "Password123",
          name: "Existing User",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("login", () => {
    it("should login an existing user", async () => {
      mockAuth.getUserByEmail.mockResolvedValue({
        uid: "user-123",
        email: "user@example.com",
        displayName: "Test User",
      });
      mockFirebaseService.getDocument.mockResolvedValue({
        id: "user-123",
        name: "Test User",
        role: "ADMIN",
      });
      mockAuth.createCustomToken.mockResolvedValue("login-token-123");

      const result = await service.login({
        email: "user@example.com",
        password: "Password123",
      });

      expect(result.success).toBe(true);
      expect(result.data.token).toBe("login-token-123");
    });

    it("should throw UnauthorizedException for invalid credentials", async () => {
      mockAuth.getUserByEmail.mockRejectedValue(new Error("User not found"));

      await expect(
        service.login({
          email: "wrong@example.com",
          password: "wrongpassword",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      mockAuth.revokeRefreshTokens.mockResolvedValue(undefined);

      const mockReq = { user: { uid: "user-123" } };
      const result = await service.logout(mockReq as any);

      expect(result.success).toBe(true);
      expect(mockAuth.revokeRefreshTokens).toHaveBeenCalledWith("user-123");
    });

    it("should handle logout without user gracefully", async () => {
      const mockReq = {};
      const result = await service.logout(mockReq as any);

      expect(result.success).toBe(true);
      expect(mockAuth.revokeRefreshTokens).not.toHaveBeenCalled();
    });
  });

  describe("refreshToken", () => {
    it("should refresh token for authenticated user", async () => {
      mockAuth.createCustomToken.mockResolvedValue("refreshed-token");

      const mockReq = { user: { uid: "user-123" } };
      const result = await service.refreshToken(mockReq as any);

      expect(result.success).toBe(true);
      expect(result.data.token).toBe("refreshed-token");
    });

    it("should throw UnauthorizedException for unauthenticated user", async () => {
      const mockReq = {};

      await expect(service.refreshToken(mockReq as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
