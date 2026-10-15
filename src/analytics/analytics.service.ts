import { Injectable } from "@nestjs/common";
import { WhereFilterOp } from "firebase-admin/firestore";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";

@Injectable()
export class AnalyticsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getDashboard(user: AuthUser) {
    const companyId = user.companyId;

    // If Firebase is not configured, return mock dashboard data
    if (!this.firebaseService.isFirebaseReady()) {
      return {
        success: true,
        data: {
          kpi: {
            totalRevenue: 272500,
            totalProfit: 65400,
            availableStock: 4000,
            activeShipments: 2,
            totalProducts: 5,
            totalSuppliers: 3,
            totalCustomers: 3,
            businessHealth: 82,
          },
          recentActivity: [
            { type: "SALES_ORDER", description: "Sales order SO-2026-0001 - China Foods Import Co.", status: "COMPLETED", date: new Date().toISOString() },
            { type: "SALES_ORDER", description: "Sales order SO-2026-0002 - Japan Starch Industries", status: "SHIPPED", date: new Date().toISOString() },
            { type: "PURCHASE_ORDER", description: "Purchase order PO-2026-0002 - Thai Indocassava Corp", status: "IN_TRANSIT", date: new Date().toISOString() },
            { type: "SHIPMENT", description: "Shipment MSKU1234567 departed from Surabaya", status: "IN_TRANSIT", date: new Date().toISOString() },
            { type: "QUALITY_CONTROL", description: "Batch inspection completed - Grade A", status: "APPROVED", date: new Date().toISOString() },
          ],
          topProducts: [
            { productId: "product-001", productName: "Fresh Cassava", revenue: 80000, quantity: 400, margin: 25 },
            { productId: "product-002", productName: "Cassava Flour", revenue: 87500, quantity: 250, margin: 28.5 },
            { productId: "product-003", productName: "Cassava Chips", revenue: 105000, quantity: 350, margin: 30 },
          ],
          revenueByCountry: [
            { country: "China", revenue: 80000, percentage: 29.4 },
            { country: "Japan", revenue: 87500, percentage: 32.1 },
            { country: "South Korea", revenue: 105000, percentage: 38.5 },
          ],
        },
        message: "Dashboard analytics retrieved successfully (mock mode)",
      };
    }

    // Get counts for each collection
    const filters:
      { field: string; operator: WhereFilterOp; value: unknown }[] | undefined =
      companyId
        ? [{ field: "companyId", operator: "==", value: companyId }]
        : undefined;

    const [
      products,
      suppliers,
      customers,
      purchaseOrders,
      salesOrders,
      shipments,
      inventory,
    ] = await Promise.all([
      this.firebaseService.getDocuments("products", filters),
      this.firebaseService.getDocuments("suppliers", filters),
      this.firebaseService.getDocuments("customers", filters),
      this.firebaseService.getDocuments("purchaseOrders", filters),
      this.firebaseService.getDocuments("salesOrders", filters),
      this.firebaseService.getDocuments("shipments", filters),
      this.firebaseService.getDocuments("inventory", filters),
    ]);

    // Calculate KPIs
    const totalRevenue = salesOrders.reduce(
      (sum, o) => sum + (o.total || 0),
      0,
    );
    const totalStock = inventory.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const activeShipments = shipments.filter(
      (s) => s.status === "IN_TRANSIT" || s.status === "PREPARING",
    ).length;

    // Get recent activity
    const recentSales = salesOrders.slice(0, 5).map((o) => ({
      type: "SALES_ORDER",
      description: `Sales order ${o.soNumber} - ${o.customerName || "Unknown"}`,
      status: o.status,
      date: o.createdAt,
    }));

    return {
      success: true,
      data: {
        kpi: {
          totalRevenue,
          totalProfit: totalRevenue * 0.24,
          availableStock: totalStock,
          activeShipments,
          totalProducts: products.length,
          totalSuppliers: suppliers.length,
          totalCustomers: customers.length,
          businessHealth: 82,
        },
        recentActivity: recentSales,
        topProducts: [],
        revenueByCountry: [],
      },
      message: "Dashboard analytics retrieved successfully",
    };
  }

  async getRevenueGrowth(query: any, user: AuthUser) {
    const filters:
      { field: string; operator: WhereFilterOp; value: unknown }[] | undefined =
      user.companyId
        ? [{ field: "companyId", operator: "==", value: user.companyId }]
        : undefined;

    const salesOrders = await this.firebaseService.getDocuments(
      "salesOrders",
      filters,
      { field: "createdAt", direction: "desc" },
      100,
    );

    // Group by month (simplified)
    const monthlyRevenue: Record<string, number> = {};
    salesOrders.forEach((order) => {
      const date = new Date(order.createdAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (order.total || 0);
    });

    return {
      success: true,
      data: {
        monthlyRevenue,
        totalRevenue: salesOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      },
      message: "Revenue growth data retrieved successfully",
    };
  }

  async getVolumeGrowth(query: any, user: AuthUser) {
    const filters:
      { field: string; operator: WhereFilterOp; value: unknown }[] | undefined =
      user.companyId
        ? [{ field: "companyId", operator: "==", value: user.companyId }]
        : undefined;

    const salesOrders = await this.firebaseService.getDocuments(
      "salesOrders",
      filters,
      { field: "createdAt", direction: "desc" },
      100,
    );

    const monthlyVolume: Record<string, number> = {};
    salesOrders.forEach((order) => {
      const date = new Date(order.createdAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyVolume[month] =
        (monthlyVolume[month] || 0) + (order.quantity || 0);
    });

    return {
      success: true,
      data: {
        monthlyVolume,
        totalVolume: salesOrders.reduce((sum, o) => sum + (o.quantity || 0), 0),
      },
      message: "Volume growth data retrieved successfully",
    };
  }

  async getProfitGrowth(query: any, user: AuthUser) {
    const filters:
      { field: string; operator: WhereFilterOp; value: unknown }[] | undefined =
      user.companyId
        ? [{ field: "companyId", operator: "==", value: user.companyId }]
        : undefined;

    const [salesOrders, transactions] = await Promise.all([
      this.firebaseService.getDocuments(
        "salesOrders",
        filters,
        { field: "createdAt", direction: "desc" },
        100,
      ),
      this.firebaseService.getDocuments("transactions", filters),
    ]);

    const totalRevenue = salesOrders.reduce(
      (sum, o) => sum + (o.total || 0),
      0,
    );
    const totalExpenses = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const profit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      success: true,
      data: {
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit,
        margin: Math.round(margin * 100) / 100,
      },
      message: "Profit growth data retrieved successfully",
    };
  }
}
