import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { FirebaseService } from "../services/firebase.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    try {
      // Verify Firebase token
      if (this.firebaseService.isFirebaseReady()) {
        const decodedToken = await this.firebaseService
          .getAuth()
          .verifyIdToken(token);

        // Fetch user profile from Firestore to get role and companyId
        let role: string | undefined;
        let companyId: string | undefined;

        try {
          const userDoc = await this.firebaseService.getDocument(
            "users",
            decodedToken.uid,
          );
          if (userDoc) {
            role = userDoc.role;
            companyId = userDoc.companyId;
          }
        } catch {
          // User document not found - proceed with token data only
        }

        request.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
          role,
          companyId,
        };
      } else {
        // Mock mode: parse mock token to get actual user uid
        // Mock tokens are in format: mock-token-{uid}
        const mockUid = token.startsWith("mock-token-")
          ? token.replace("mock-token-", "")
          : "dev-user-001";

        // Try to fetch user profile from mock store
        let role: string | undefined;
        let companyId: string | undefined;
        let email = "admin@indocassava.com";

        try {
          const userDoc = await this.firebaseService.getDocument(
            "users",
            mockUid,
          );
          if (userDoc) {
            role = userDoc.role;
            companyId = userDoc.companyId;
            email = userDoc.email || email;
          }
        } catch {
          // User not found - use defaults
        }

        request.user = {
          uid: mockUid,
          email,
          emailVerified: true,
          role: role || "OWNER",
          companyId: companyId || "company-dev-001",
        };
      }

      return true;
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
