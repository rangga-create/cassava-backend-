import { Injectable } from "@nestjs/common";
import { FirebaseService } from "../common/services/firebase.service";
import { AuthUser } from "../common/decorators/current-user.decorator";

@Injectable()
export class FinanceService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getRevenue(query: any, user: AuthUser) {
    const filters: { field: string; operator: any; value: unknown }[] = [
      { field: "type", operator: "==", value: "REVENUE" },
    ];

    if (user.companyId) {
      filters.push({
        field: "companyId",
        operator: "==",
        value: user.companyId,
      });
    }

    const transactions = await this.firebaseService.getDocuments(
      "transactions",
      filters,
    );

    const totalRevenue = transactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );

    return {
      success: true,
      data: {
        totalRevenue,
        transactions,
      },
      message: "Revenue data retrieved successfully",
    };
  }

  async getExpenses(query: any, user: AuthUser) {
    const filters: { field: string; operator: any; value: unknown }[] = [
      { field: "type", operator: "==", value: "EXPENSE" },
    ];

    if (user.companyId) {
      filters.push({
        field: "companyId",
        operator: "==",
        value: user.companyId,
      });
    }

    const transactions = await this.firebaseService.getDocuments(
      "transactions",
      filters,
    );

    const totalExpenses = transactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );

    return {
      success: true,
      data: {
        totalExpenses,
        transactions,
      },
      message: "Expenses data retrieved successfully",
    };
  }

  async getCashFlow(query: any, user: AuthUser) {
    const filters: { field: string; operator: any; value: unknown }[] = [];

    if (user.companyId) {
      filters.push({
        field: "companyId",
        operator: "==",
        value: user.companyId,
      });
    }

    const transactions = await this.firebaseService.getDocuments(
      "transactions",
      filters,
      { field: "createdAt", direction: "desc" },
      100,
    );

    const inflow = transactions
      .filter((t) => t.type === "REVENUE")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const outflow = transactions
      .filter((t) => t.type === "EXPENSE" || t.type === "PAYMENT")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      success: true,
      data: {
        inflow,
        outflow,
        netCashFlow: inflow - outflow,
        transactions,
      },
      message: "Cash flow data retrieved successfully",
    };
  }

  async getProfitability(query: any, user: AuthUser) {
    const filters: { field: string; operator: any; value: unknown }[] = [];

    if (user.companyId) {
      filters.push({
        field: "companyId",
        operator: "==",
        value: user.companyId,
      });
    }

    // Get all transactions
    const transactions = await this.firebaseService.getDocuments(
      "transactions",
      filters,
    );

    const revenue = transactions
      .filter((t) => t.type === "REVENUE")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const expenses = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const grossProfit = revenue - expenses;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    return {
      success: true,
      data: {
        revenue,
        expenses,
        grossProfit,
        grossMargin: Math.round(grossMargin * 100) / 100,
      },
      message: "Profitability data retrieved successfully",
    };
  }
}
