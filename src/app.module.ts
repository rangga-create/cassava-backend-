import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { CommonModule } from "./common/services/common.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CompaniesModule } from "./companies/companies.module";
import { ProductsModule } from "./products/products.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { CustomersModule } from "./customers/customers.module";
import { ProcurementModule } from "./procurement/procurement.module";
import { InventoryModule } from "./inventory/inventory.module";
import { WarehouseModule } from "./warehouse/warehouse.module";
import { QualityControlModule } from "./quality-control/quality-control.module";
import { ProcessingModule } from "./processing/processing.module";
import { SalesModule } from "./sales/sales.module";
import { ExportModule } from "./export/export.module";
import { ImportModule } from "./import/import.module";
import { ShipmentsModule } from "./shipments/shipments.module";
import { FinanceModule } from "./finance/finance.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { ReportsModule } from "./reports/reports.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { HealthModule } from "./health/health.module";
import { CategoriesModule } from "./categories/categories.module";
import { OrdersModule } from "./orders/orders.module";
import { CartModule } from "./cart/cart.module";
import { PaymentsModule } from "./payments/payments.module";
import { UploadModule } from "./upload/upload.module";
import { ContactModule } from "./contact/contact.module";
import { EmailModule } from "./email/email.module";
import { AiModule } from "./ai/ai.module";
import { CommunityModule } from "./community/community.module";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Common
    CommonModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    CompaniesModule,
    ProductsModule,
    SuppliersModule,
    CustomersModule,
    ProcurementModule,
    InventoryModule,
    WarehouseModule,
    QualityControlModule,
    ProcessingModule,
    SalesModule,
    ExportModule,
    ImportModule,
    ShipmentsModule,
    FinanceModule,
    AnalyticsModule,
    ReportsModule,
    NotificationsModule,
    HealthModule,
    CategoriesModule,
    OrdersModule,
    CartModule,
    UploadModule,
    PaymentsModule,
    ContactModule,
    EmailModule,
    AiModule,
    CommunityModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
