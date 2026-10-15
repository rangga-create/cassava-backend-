import { Injectable } from "@nestjs/common";
import { WhereFilterOp } from "firebase-admin/firestore";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";

@Injectable()
export class ReportsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private getFilters(
    user: AuthUser,
  ): { field: string; operator: WhereFilterOp; value: unknown }[] | undefined {
    return user.companyId
      ? [{ field: "companyId", operator: "==", value: user.companyId }]
      : undefined;
  }

  async getProcurementReport(query: any, user: AuthUser) {
    const purchaseOrders = await this.firebaseService.getDocuments(
      "purchaseOrders",
      this.getFilters(user),
    );

    const totalOrders = purchaseOrders.length;
    const totalValue = purchaseOrders.reduce(
      (sum, o) => sum + (o.total || 0),
      0,
    );
    const completedOrders = purchaseOrders.filter(
      (o) => o.status === "COMPLETED",
    ).length;

    return {
      success: true,
      data: {
        totalOrders,
        totalValue,
        completedOrders,
        pendingOrders: totalOrders - completedOrders,
        orders: purchaseOrders,
      },
      message: "Procurement report generated successfully",
    };
  }

  async getInventoryReport(query: any, user: AuthUser) {
    const inventory = await this.firebaseService.getDocuments(
      "inventory",
      this.getFilters(user),
    );

    const totalItems = inventory.length;
    const totalQuantity = inventory.reduce(
      (sum, i) => sum + (i.quantity || 0),
      0,
    );
    const totalValue = inventory.reduce(
      (sum, i) => sum + (i.stockValue || 0),
      0,
    );

    return {
      success: true,
      data: {
        totalItems,
        totalQuantity,
        totalValue,
        items: inventory,
      },
      message: "Inventory report generated successfully",
    };
  }

  async getQualityReport(query: any, user: AuthUser) {
    const inspections = await this.firebaseService.getDocuments(
      "qualityInspections",
      this.getFilters(user),
    );

    const totalInspections = inspections.length;
    const approved = inspections.filter((i) => i.result === "APPROVED").length;
    const conditional = inspections.filter(
      (i) => i.result === "CONDITIONAL",
    ).length;
    const rejected = inspections.filter((i) => i.result === "REJECTED").length;

    const avgScore =
      totalInspections > 0
        ? inspections.reduce((sum, i) => sum + (i.qualityScore || 0), 0) /
          totalInspections
        : 0;

    return {
      success: true,
      data: {
        totalInspections,
        approved,
        conditional,
        rejected,
        avgScore: Math.round(avgScore * 100) / 100,
        inspections,
      },
      message: "Quality report generated successfully",
    };
  }

  async getSalesReport(query: any, user: AuthUser) {
    const salesOrders = await this.firebaseService.getDocuments(
      "salesOrders",
      this.getFilters(user),
    );

    const totalOrders = salesOrders.length;
    const totalRevenue = salesOrders.reduce(
      (sum, o) => sum + (o.total || 0),
      0,
    );
    const completedOrders = salesOrders.filter(
      (o) => o.status === "COMPLETED",
    ).length;

    return {
      success: true,
      data: {
        totalOrders,
        totalRevenue,
        completedOrders,
        orders: salesOrders,
      },
      message: "Sales report generated successfully",
    };
  }

  async getExportReport(query: any, user: AuthUser) {
    const exportOrders = await this.firebaseService.getDocuments(
      "exportOrders",
      this.getFilters(user),
    );

    const totalOrders = exportOrders.length;
    const totalValue = exportOrders.reduce((sum, o) => sum + (o.value || 0), 0);

    return {
      success: true,
      data: {
        totalOrders,
        totalValue,
        orders: exportOrders,
      },
      message: "Export report generated successfully",
    };
  }

  async getImportReport(query: any, user: AuthUser) {
    const importOrders = await this.firebaseService.getDocuments(
      "importOrders",
      this.getFilters(user),
    );

    const totalOrders = importOrders.length;
    const totalValue = importOrders.reduce(
      (sum, o) => sum + (o.landedCost || 0),
      0,
    );

    return {
      success: true,
      data: {
        totalOrders,
        totalValue,
        orders: importOrders,
      },
      message: "Import report generated successfully",
    };
  }

  async getShipmentReport(query: any, user: AuthUser) {
    const shipments = await this.firebaseService.getDocuments(
      "shipments",
      this.getFilters(user),
    );

    const totalShipments = shipments.length;
    const inTransit = shipments.filter((s) => s.status === "IN_TRANSIT").length;
    const delivered = shipments.filter((s) => s.status === "DELIVERED").length;

    return {
      success: true,
      data: {
        totalShipments,
        inTransit,
        delivered,
        shipments,
      },
      message: "Shipment report generated successfully",
    };
  }

  async getFinancialReport(query: any, user: AuthUser) {
    const transactions = await this.firebaseService.getDocuments(
      "transactions",
      this.getFilters(user),
    );

    const revenue = transactions
      .filter((t) => t.type === "REVENUE")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const expenses = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const profit = revenue - expenses;

    return {
      success: true,
      data: {
        revenue,
        expenses,
        profit,
        margin: revenue > 0 ? Math.round((profit / revenue) * 10000) / 100 : 0,
      },
      message: "Financial report generated successfully",
    };
  }

  async getProfitabilityReport(query: any, user: AuthUser) {
    const [salesOrders, transactions, products] = await Promise.all([
      this.firebaseService.getDocuments("salesOrders", this.getFilters(user)),
      this.firebaseService.getDocuments("transactions", this.getFilters(user)),
      this.firebaseService.getDocuments("products", this.getFilters(user)),
    ]);

    const totalRevenue = salesOrders.reduce(
      (sum, o) => sum + (o.total || 0),
      0,
    );
    const totalExpenses = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const grossProfit = totalRevenue - totalExpenses;
    const grossMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        grossProfit,
        grossMargin: Math.round(grossMargin * 100) / 100,
      },
      message: "Profitability report generated successfully",
    };
  }

  async getSupplierReport(query: any, user: AuthUser) {
    const suppliers = await this.firebaseService.getDocuments(
      "suppliers",
      this.getFilters(user),
    );

    const totalSuppliers = suppliers.length;
    const avgQualityScore =
      totalSuppliers > 0
        ? suppliers.reduce((sum, s) => sum + (s.qualityScore || 0), 0) /
          totalSuppliers
        : 0;
    const avgReliabilityScore =
      totalSuppliers > 0
        ? suppliers.reduce((sum, s) => sum + (s.reliabilityScore || 0), 0) /
          totalSuppliers
        : 0;

    return {
      success: true,
      data: {
        totalSuppliers,
        avgQualityScore: Math.round(avgQualityScore * 100) / 100,
        avgReliabilityScore: Math.round(avgReliabilityScore * 100) / 100,
        suppliers,
      },
      message: "Supplier report generated successfully",
    };
  }

  async getCustomerReport(query: any, user: AuthUser) {
    const customers = await this.firebaseService.getDocuments(
      "customers",
      this.getFilters(user),
    );

    const totalCustomers = customers.length;
    const totalPurchase = customers.reduce(
      (sum, c) => sum + (c.totalPurchase || 0),
      0,
    );
    const totalOutstanding = customers.reduce(
      (sum, c) => sum + (c.outstanding || 0),
      0,
    );

    return {
      success: true,
      data: {
        totalCustomers,
        totalPurchase,
        totalOutstanding,
        customers,
      },
      message: "Customer report generated successfully",
    };
  }
}
