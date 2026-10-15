import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // ============================================
  // Global Interceptors & Filters
  // ============================================
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // ============================================
  // CORS Configuration
  // ============================================
  app.enableCors({
    origin: configService.get<string>("FRONTEND_URL", "http://localhost:3000"),
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  // ============================================
  // Global Prefix
  // ============================================
  app.setGlobalPrefix("api/v1");

  // ============================================
  // Validation Pipe
  // ============================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ============================================
  // Swagger Configuration
  // ============================================
  const config = new DocumentBuilder()
    .setTitle("INDOCASSAVA API")
    .setDescription(
      "INDOCASSAVA - Digital Business Operating System for Cassava Trading",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("auth", "Authentication endpoints")
    .addTag("users", "User management endpoints")
    .addTag("companies", "Company management endpoints")
    .addTag("products", "Product management endpoints")
    .addTag("suppliers", "Supplier management endpoints")
    .addTag("customers", "Customer management endpoints")
    .addTag("procurement", "Procurement management endpoints")
    .addTag("inventory", "Inventory management endpoints")
    .addTag("warehouse", "Warehouse management endpoints")
    .addTag("quality-control", "Quality control endpoints")
    .addTag("processing", "Processing management endpoints")
    .addTag("sales", "Sales management endpoints")
    .addTag("export", "Export management endpoints")
    .addTag("import", "Import management endpoints")
    .addTag("shipments", "Shipment management endpoints")
    .addTag("finance", "Financial management endpoints")
    .addTag("analytics", "Analytics endpoints")
    .addTag("reports", "Reports endpoints")
    .addTag("categories", "Category management endpoints")
    .addTag("orders", "Customer order management endpoints")
    .addTag("cart", "Shopping cart endpoints")
    .addTag("contact", "Contact form endpoints")
    .addTag("health", "Health check endpoints")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  // ============================================
  // Start Server
  // ============================================
  const port = configService.get<number>("PORT", 3001);
  await app.listen(port);

  console.log(`🚀 INDOCASSAVA Backend is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
