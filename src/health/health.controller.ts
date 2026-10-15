import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { FirebaseService } from "../common/services/firebase.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Get()
  @ApiOperation({ summary: "Liveness check - is the server running?" })
  check() {
    return {
      success: true,
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
      message: "Server is healthy",
    };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness check - are dependencies available?" })
  readiness() {
    const firebaseReady = this.firebaseService.isFirebaseReady();

    return {
      success: true,
      data: {
        status: firebaseReady ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        services: {
          firebase: firebaseReady ? "connected" : "mock_mode",
          firestore: firebaseReady ? "connected" : "mock_mode",
        },
      },
      message: firebaseReady
        ? "All services ready"
        : "Running in mock mode - Firebase not configured",
    };
  }
}
