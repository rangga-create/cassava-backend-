import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import { FirebaseService } from "../common/services/firebase.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { Request } from "express";

@Injectable()
export class AuthService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Check if Firebase is available
    if (!this.firebaseService.isFirebaseReady()) {
      // Mock mode: create user without Firebase
      const mockUid = `mock-${Date.now()}`;
      const mockToken = `mock-token-${mockUid}`;

      console.log(`[MOCK] Registered user: ${email} (uid: ${mockUid})`);

      return {
        success: true,
        data: {
          uid: mockUid,
          email,
          name,
          token: mockToken,
          user: {
            id: mockUid,
            email,
            name,
            role: "VIEWER",
            status: "ACTIVE",
          },
        },
        message: "User registered successfully (mock mode - Firebase not configured)",
      };
    }

    // Check if user already exists
    try {
      const existingUser = await this.firebaseService
        .getAuth()
        .getUserByEmail(email);
      if (existingUser) {
        throw new ConflictException("User with this email already exists");
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      // User not found - proceed with registration
    }

    // Create user in Firebase Auth
    const userRecord = await this.firebaseService.getAuth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
    });

    // Create user document in Firestore
    const userDoc = {
      email,
      name,
      role: "VIEWER", // Default role
      status: "ACTIVE",
      avatar: null,
      phone: null,
    };

    await this.firebaseService
      .getFirestore()
      .collection("users")
      .doc(userRecord.uid)
      .set({
        ...userDoc,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Generate custom token for immediate login
    const customToken = await this.firebaseService
      .getAuth()
      .createCustomToken(userRecord.uid);

    return {
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
        token: customToken,
      },
      message: "User registered successfully",
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Check if Firebase is available
    if (!this.firebaseService.isFirebaseReady()) {
      // Mock mode: return mock user with predefined accounts
      const mockUsers: Record<
        string,
        { uid: string; name: string; role: string }
      > = {
        "admin@indocassava.com": {
          uid: "user-admin-001",
          name: "Angga",
          role: "OWNER",
        },
        "manager@indocassava.com": {
          uid: "user-manager-001",
          name: "Angga",
          role: "MANAGER",
        },
        "sales@indocassava.com": {
          uid: "user-sales-001",
          name: "Budi Santoso",
          role: "SALES",
        },
      };

      const mockUser = mockUsers[email];
      const mockUid = mockUser?.uid || `mock-${email.replace(/[^a-z0-9]/gi, "-")}`;
      const mockName = mockUser?.name || email.split("@")[0];
      const mockRole = mockUser?.role || "VIEWER";
      const mockToken = `mock-token-${mockUid}`;

      console.log(`[MOCK] Login: ${email} (role: ${mockRole})`);

      return {
        success: true,
        data: {
          uid: mockUid,
          email,
          name: mockName,
          token: mockToken,
          user: {
            id: mockUid,
            email,
            name: mockName,
            role: mockRole,
            status: "ACTIVE",
          },
        },
        message: "Login successful (mock mode - Firebase not configured)",
      };
    }

    // For server-side login, we need to use the REST API or custom token
    // In production, the client should use Firebase Auth SDK directly
    // This endpoint is for programmatic access

    try {
      const userRecord = await this.firebaseService
        .getAuth()
        .getUserByEmail(email);

      // Get user data from Firestore
      const userDoc = await this.firebaseService.getDocument(
        "users",
        userRecord.uid,
      );

      // Generate custom token
      const customToken = await this.firebaseService
        .getAuth()
        .createCustomToken(userRecord.uid);

      return {
        success: true,
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          name: userRecord.displayName,
          token: customToken,
          user: userDoc,
        },
        message: "Login successful",
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid email or password");
    }
  }

  async logout(req: Request) {
    // Firebase tokens are stateless, so logout is handled client-side
    // We can revoke the token if needed
    const user = (req as any).user;

    if (user?.uid) {
      try {
        await this.firebaseService.getAuth().revokeRefreshTokens(user.uid);
      } catch (error) {
        // Token revocation failed - not critical
      }
    }

    return {
      success: true,
      data: null,
      message: "Logged out successfully",
    };
  }

  async refreshToken(req: Request) {
    const user = (req as any).user;

    if (!user?.uid) {
      throw new UnauthorizedException("User not authenticated");
    }

    // Generate a new custom token
    const customToken = await this.firebaseService
      .getAuth()
      .createCustomToken(user.uid);

    return {
      success: true,
      data: {
        token: customToken,
      },
      message: "Token refreshed successfully",
    };
  }
}
