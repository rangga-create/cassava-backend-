import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// ============================================
// In-Memory Store for Mock Mode (with file persistence)
// ============================================
class MockStore {
  private collections: Map<string, Map<string, any>> = new Map();
  private autoIncrement: Map<string, number> = new Map();
  private dataFilePath: string;
  private persistCollections = [
    "notifications",
    "contactMessages",
    "users",
    "groups",
    "groupMembers",
    "groupInvitations",
    "messages",
    "reports",
    "moderationActions",
  ];

  constructor() {
    this.dataFilePath = path.join(process.cwd(), "mock-data.json");
    this.loadFromFile();
  }

  private getCollection(name: string): Map<string, any> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name)!;
  }

  private generateId(collection: string): string {
    const current = this.autoIncrement.get(collection) || 1000;
    const next = current + 1;
    this.autoIncrement.set(collection, next);
    return `${collection.slice(0, 3)}-${String(next).padStart(4, "0")}`;
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, "utf-8");
        const saved = JSON.parse(raw);
        if (saved && typeof saved === "object") {
          for (const [collectionName, documents] of Object.entries(saved)) {
            if (Array.isArray(documents)) {
              const store = this.getCollection(collectionName);
              let maxId = 1000;
              for (const doc of documents) {
                const d = doc as any;
                store.set(d.id, d);
                const numPart = parseInt(d.id?.split("-").pop() || "0", 10);
                if (numPart > maxId) maxId = numPart;
              }
              this.autoIncrement.set(collectionName, maxId);
            }
          }
          console.log("📂 Mock data loaded from file");
        }
      }
    } catch (error) {
      // File doesn't exist or is corrupted, will use seed data
    }
  }

  private saveToFile(): void {
    try {
      const data: Record<string, any[]> = {};
      for (const collectionName of this.persistCollections) {
        const store = this.collections.get(collectionName);
        if (store) {
          data[collectionName] = Array.from(store.values());
        }
      }
      fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      console.warn("Failed to save mock data to file:", error);
    }
  }

  create(collection: string, data: any): string {
    const id = data.id || this.generateId(collection);
    const store = this.getCollection(collection);
    const now = new Date().toISOString();
    store.set(id, {
      ...data,
      id,
      createdAt: data.createdAt || now,
      updatedAt: now,
    });
    if (this.persistCollections.includes(collection)) {
      this.saveToFile();
    }
    return id;
  }

  get(collection: string, id: string): any | null {
    const store = this.getCollection(collection);
    return store.get(id) || null;
  }

  getAll(
    collection: string,
    filters?: { field: string; operator: string; value: any }[],
    orderBy?: { field: string; direction: "asc" | "desc" },
    limit?: number,
  ): any[] {
    const store = this.getCollection(collection);
    let results = Array.from(store.values());

    // Apply filters
    if (filters && filters.length > 0) {
      results = results.filter((doc) =>
        filters.every((f) => {
          const docValue = doc[f.field];
          switch (f.operator) {
            case "==":
              return docValue === f.value;
            case "!=":
              return docValue !== f.value;
            case ">":
              return docValue > f.value;
            case "<":
              return docValue < f.value;
            case ">=":
              return docValue >= f.value;
            case "<=":
              return docValue <= f.value;
            case "array-contains":
              return Array.isArray(docValue) && docValue.includes(f.value);
            default:
              return true;
          }
        }),
      );
    }

    // Apply sorting
    if (orderBy) {
      results.sort((a, b) => {
        const aVal = a[orderBy.field] || "";
        const bVal = b[orderBy.field] || "";
        if (orderBy.direction === "asc") {
          return aVal > bVal ? 1 : -1;
        }
        return aVal < bVal ? 1 : -1;
      });
    }

    // Apply limit
    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  update(collection: string, id: string, data: any): boolean {
    const store = this.getCollection(collection);
    const existing = store.get(id);
    if (!existing) return false;
    store.set(id, {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    });
    if (this.persistCollections.includes(collection)) {
      this.saveToFile();
    }
    return true;
  }

  delete(collection: string, id: string): boolean {
    const store = this.getCollection(collection);
    const result = store.delete(id);
    if (result && this.persistCollections.includes(collection)) {
      this.saveToFile();
    }
    return result;
  }

  count(
    collection: string,
    filters?: { field: string; operator: string; value: any }[],
  ): number {
    return this.getAll(collection, filters).length;
  }

  // Seed initial data (only if collection is empty or item doesn't exist)
  seed(collection: string, items: any[]): void {
    const store = this.getCollection(collection);
    items.forEach((item) => {
      const id = item.id || this.generateId(collection);
      if (!store.has(id)) {
        store.set(id, {
          ...item,
          id,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
        });
      }
    });
    if (this.persistCollections.includes(collection)) {
      this.saveToFile();
    }
  }
}

// ============================================
// Firebase Service
// ============================================
@Injectable()
export class FirebaseService implements OnModuleInit {
  private firebaseApp: admin.app.App;
  private firestore: admin.firestore.Firestore;
  private mockStore: MockStore;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initializeFirebase();
    if (!this.isFirebaseReady()) {
      this.initMockStore();
    }
  }

  private initializeFirebase() {
    if (!admin.apps.length) {
      const projectId = this.configService.get<string>("FIREBASE_PROJECT_ID");
      const clientEmail = this.configService.get<string>(
        "FIREBASE_CLIENT_EMAIL",
      );
      const privateKey = this.configService.get<string>("FIREBASE_PRIVATE_KEY");

      if (
        projectId &&
        clientEmail &&
        privateKey &&
        projectId !== "your_project_id" &&
        !clientEmail.includes("your_") &&
        !privateKey.includes("your_")
      ) {
        try {
          this.firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, "\n"),
            }),
          });
          this.firestore = this.firebaseApp.firestore();
          console.log("✅ Firebase Admin initialized successfully");
        } catch (error) {
          console.warn(
            "⚠️ Failed to initialize Firebase Admin. Using mock data for development.",
          );
          this.firebaseApp = null as any;
        }
      } else {
        console.warn(
          "⚠️ Firebase credentials not configured. Using mock data for development.",
        );
      }
    } else {
      this.firebaseApp = admin.apps[0]!;
      this.firestore = this.firebaseApp.firestore();
    }
  }

  // ============================================
  // Mock Store Initialization with Seed Data
  // ============================================
  private initMockStore() {
    this.mockStore = new MockStore();
    console.log("📦 Mock store initialized with seed data");

    // Seed users
    this.mockStore.seed("users", [
      {
        id: "user-admin-001",
        companyId: "company-dev-001",
        name: "Admin Indocassava",
        email: "admin@indocassava.com",
        role: "OWNER",
        status: "ACTIVE",
        phone: "+62 812 3456 7890",
      },
      {
        id: "user-manager-001",
        companyId: "company-dev-001",
        name: "Manager Indocassava",
        email: "manager@indocassava.com",
        role: "MANAGER",
        status: "ACTIVE",
        phone: "+62 813 4567 8901",
      },
      {
        id: "user-sales-001",
        companyId: "company-dev-001",
        name: "Sales Indocassava",
        email: "sales@indocassava.com",
        role: "SALES",
        status: "ACTIVE",
        phone: "+62 814 5678 9012",
      },
      {
        id: "user-customer-001",
        companyId: "company-dev-001",
        name: "John Doe",
        email: "customer@indocassava.com",
        role: "CUSTOMER",
        status: "ACTIVE",
        phone: "+62 815 6789 0123",
      },
    ]);

    // Seed companies
    this.mockStore.seed("companies", [
      {
        id: "company-dev-001",
        name: "PT Indocassava Trading",
        description: "Leading cassava trading company in Southeast Asia",
        industry: "Agriculture & Trading",
        status: "ACTIVE",
        address: "Jl. Raya Surabaya No. 123",
        country: "Indonesia",
        province: "East Java",
        city: "Surabaya",
        phone: "+62 31 123 4567",
        email: "info@indocassava.com",
      },
    ]);

    // Seed categories
    this.mockStore.seed("categories", [
      { id: "cat-001", companyId: "company-dev-001", name: "Fresh Cassava", description: "Fresh cassava roots", status: "ACTIVE", sortOrder: 1, productCount: 1 },
      { id: "cat-002", companyId: "company-dev-001", name: "Cassava Flour", description: "Premium cassava flour", status: "ACTIVE", sortOrder: 2, productCount: 1 },
      { id: "cat-003", companyId: "company-dev-001", name: "Cassava Chips", description: "Dried cassava chips", status: "ACTIVE", sortOrder: 3, productCount: 1 },
      { id: "cat-004", companyId: "company-dev-001", name: "Tapioca Starch", description: "High quality tapioca starch", status: "ACTIVE", sortOrder: 4, productCount: 1 },
      { id: "cat-005", companyId: "company-dev-001", name: "Cassava Pellets", description: "Cassava pellets for animal feed", status: "ACTIVE", sortOrder: 5, productCount: 1 },
    ]);

    // Seed products
    this.mockStore.seed("products", [
      {
        id: "product-001", companyId: "company-dev-001", sku: "CSV-FRESH-001", name: "Fresh Cassava",
        description: "Fresh cassava roots, grade A", category: "FRESH", grade: "A", unit: "MT",
        origin: "East Java, Indonesia", purchaseCost: 150, processingCost: 0, sellingPrice: 200,
        margin: 25, stock: 1500, status: "ACTIVE",
      },
      {
        id: "product-002", companyId: "company-dev-001", sku: "CSV-FLOUR-001", name: "Cassava Flour",
        description: "Premium cassava flour for food industry", category: "FLOUR", grade: "A", unit: "MT",
        origin: "East Java, Indonesia", purchaseCost: 200, processingCost: 50, sellingPrice: 350,
        margin: 28.5, stock: 800, status: "ACTIVE",
      },
      {
        id: "product-003", companyId: "company-dev-001", sku: "CSV-CHIPS-001", name: "Cassava Chips",
        description: "Dried cassava chips for export", category: "CHIPS", grade: "A", unit: "MT",
        origin: "Central Java, Indonesia", purchaseCost: 180, processingCost: 30, sellingPrice: 300,
        margin: 30, stock: 1200, status: "ACTIVE",
      },
      {
        id: "product-004", companyId: "company-dev-001", sku: "CSV-STARCH-001", name: "Tapioca Starch",
        description: "High quality tapioca starch", category: "TAPIOCA_STARCH", grade: "A", unit: "MT",
        origin: "East Java, Indonesia", purchaseCost: 250, processingCost: 80, sellingPrice: 450,
        margin: 31.1, stock: 600, status: "ACTIVE",
      },
      {
        id: "product-005", companyId: "company-dev-001", sku: "CSV-PELLETS-001", name: "Cassava Pellets",
        description: "Cassava pellets for animal feed", category: "PELLETS", grade: "B", unit: "MT",
        origin: "South Sumatra, Indonesia", purchaseCost: 120, processingCost: 40, sellingPrice: 220,
        margin: 27.3, stock: 900, status: "ACTIVE",
      },
    ]);

    // Seed suppliers
    this.mockStore.seed("suppliers", [
      {
        id: "supplier-001", companyId: "company-dev-001", companyName: "PT Sumber Jaya Abadi",
        contactName: "Hendra Wijaya", email: "hendra@sumberjaya.co.id", phone: "+62 815 1234 5678",
        country: "Indonesia", province: "East Java", city: "Madiun", qualityScore: 92, reliabilityScore: 88,
        paymentTerms: "Net 30", status: "ACTIVE",
      },
      {
        id: "supplier-002", companyId: "company-dev-001", companyName: "Thai Indocassava Corp",
        contactName: "Somchai Patel", email: "somchai@thaicassava.co.th", phone: "+66 81 234 5678",
        country: "Thailand", qualityScore: 85, reliabilityScore: 82,
        paymentTerms: "Net 45", status: "ACTIVE",
      },
      {
        id: "supplier-003", companyId: "company-dev-001", companyName: "Vietnam Starch Ltd",
        contactName: "Nguyen Van Minh", email: "minh@vietnamstarch.vn", phone: "+84 912 345 678",
        country: "Vietnam", qualityScore: 78, reliabilityScore: 75,
        paymentTerms: "Net 30", status: "ACTIVE",
      },
    ]);

    // Seed customers
    this.mockStore.seed("customers", [
      {
        id: "customer-001", companyId: "company-dev-001", companyName: "China Foods Import Co.",
        contactName: "Li Wei", email: "liwei@chinafoods.cn", phone: "+86 138 1234 5678",
        country: "China", totalPurchase: 485200, creditLimit: 500000,
        paymentTerms: "T/T 30 days", outstanding: 125000, profitability: 24.5, status: "ACTIVE",
      },
      {
        id: "customer-002", companyId: "company-dev-001", companyName: "Japan Starch Industries",
        contactName: "Tanaka Yuki", email: "tanaka@japanstarch.jp", phone: "+81 90 1234 5678",
        country: "Japan", totalPurchase: 356800, creditLimit: 400000,
        paymentTerms: "L/C at sight", outstanding: 89000, profitability: 28.2, status: "ACTIVE",
      },
      {
        id: "customer-003", companyId: "company-dev-001", companyName: "Korea Trading Corp",
        contactName: "Kim Soo-jin", email: "soojin@koreatrading.kr", phone: "+82 10 1234 5678",
        country: "South Korea", totalPurchase: 278500, creditLimit: 300000,
        paymentTerms: "Net 30", outstanding: 67000, profitability: 22.1, status: "ACTIVE",
      },
    ]);

    // Seed warehouses
    this.mockStore.seed("warehouses", [
      {
        id: "warehouse-001", companyId: "company-dev-001", name: "Surabaya Main Warehouse",
        location: "Surabaya, East Java", capacity: 5000, occupied: 3200, available: 1800,
        manager: "Budi Santoso", status: "ACTIVE",
      },
      {
        id: "warehouse-002", companyId: "company-dev-001", name: "Semarang Export Warehouse",
        location: "Semarang, Central Java", capacity: 3000, occupied: 1800, available: 1200,
        manager: "Siti Rahayu", status: "ACTIVE",
      },
    ]);

    // Seed inventory
    this.mockStore.seed("inventory", [
      {
        id: "inv-001", companyId: "company-dev-001", productId: "product-001", productName: "Fresh Cassava",
        batchId: "batch-001", warehouseId: "warehouse-001", quantity: 800, reservedQuantity: 200,
        availableQuantity: 600, unit: "MT", grade: "A", stockValue: 120000, status: "AVAILABLE",
      },
      {
        id: "inv-002", companyId: "company-dev-001", productId: "product-002", productName: "Cassava Flour",
        batchId: "batch-002", warehouseId: "warehouse-001", quantity: 400, reservedQuantity: 100,
        availableQuantity: 300, unit: "MT", grade: "A", stockValue: 100000, status: "AVAILABLE",
      },
      {
        id: "inv-003", companyId: "company-dev-001", productId: "product-003", productName: "Cassava Chips",
        batchId: "batch-003", warehouseId: "warehouse-002", quantity: 600, reservedQuantity: 0,
        availableQuantity: 600, unit: "MT", grade: "A", stockValue: 108000, status: "AVAILABLE",
      },
    ]);

    // Seed purchase orders
    this.mockStore.seed("purchaseOrders", [
      {
        id: "po-001", companyId: "company-dev-001", poNumber: "PO-2026-0001", supplierId: "supplier-001",
        supplierName: "PT Sumber Jaya Abadi", productId: "product-001", productName: "Fresh Cassava",
        quantity: 500, unit: "MT", price: 150, total: 75000, status: "COMPLETED",
      },
      {
        id: "po-002", companyId: "company-dev-001", poNumber: "PO-2026-0002", supplierId: "supplier-002",
        supplierName: "Thai Indocassava Corp", productId: "product-002", productName: "Cassava Flour",
        quantity: 300, unit: "MT", price: 200, total: 60000, status: "IN_TRANSIT",
      },
      {
        id: "po-003", companyId: "company-dev-001", poNumber: "PO-2026-0003", supplierId: "supplier-001",
        supplierName: "PT Sumber Jaya Abadi", productId: "product-003", productName: "Cassava Chips",
        quantity: 400, unit: "MT", price: 180, total: 72000, status: "APPROVED",
      },
    ]);

    // Seed sales orders
    this.mockStore.seed("salesOrders", [
      {
        id: "so-001", companyId: "company-dev-001", soNumber: "SO-2026-0001", customerId: "customer-001",
        customerName: "China Foods Import Co.", productId: "product-001", productName: "Fresh Cassava",
        quantity: 400, price: 200, currency: "USD", total: 80000, status: "COMPLETED",
      },
      {
        id: "so-002", companyId: "company-dev-001", soNumber: "SO-2026-0002", customerId: "customer-002",
        customerName: "Japan Starch Industries", productId: "product-002", productName: "Cassava Flour",
        quantity: 250, price: 350, currency: "USD", total: 87500, status: "SHIPPED",
      },
      {
        id: "so-003", companyId: "company-dev-001", soNumber: "SO-2026-0003", customerId: "customer-003",
        customerName: "Korea Trading Corp", productId: "product-003", productName: "Cassava Chips",
        quantity: 350, price: 300, currency: "USD", total: 105000, status: "PROCESSING",
      },
    ]);

    // Seed shipments
    this.mockStore.seed("shipments", [
      {
        id: "shipment-001", companyId: "company-dev-001", container: "MSKU1234567", carrier: "Maersk",
        origin: "Surabaya, Indonesia", destination: "Shanghai, China", port: "Port of Surabaya",
        productId: "product-001", productName: "Fresh Cassava", quantity: 400, status: "IN_TRANSIT",
      },
      {
        id: "shipment-002", companyId: "company-dev-001", container: "SEGU7654321", carrier: "Evergreen",
        origin: "Semarang, Indonesia", destination: "Tokyo, Japan", port: "Port of Semarang",
        productId: "product-002", productName: "Cassava Flour", quantity: 250, status: "PREPARING",
      },
    ]);

    // Seed transactions
    this.mockStore.seed("transactions", [
      { id: "txn-001", companyId: "company-dev-001", type: "REVENUE", amount: 80000, currency: "USD", description: "Payment from China Foods" },
      { id: "txn-002", companyId: "company-dev-001", type: "EXPENSE", amount: 75000, currency: "USD", description: "Payment to PT Sumber Jaya" },
      { id: "txn-003", companyId: "company-dev-001", type: "EXPENSE", amount: 5000, currency: "USD", description: "Shipping cost" },
    ]);

    // Seed notifications
    this.mockStore.seed("notifications", [
      { id: "notif-001", companyId: "company-dev-001", userId: "user-admin-001", type: "INFO", title: "Shipment Update", message: "MSKU1234567 has departed", read: false },
      { id: "notif-002", companyId: "company-dev-001", userId: "user-admin-001", type: "WARNING", title: "Low Stock Alert", message: "Tapioca Starch below threshold", read: false },
      { id: "notif-003", companyId: "company-dev-001", userId: "user-admin-001", type: "SUCCESS", title: "Order Completed", message: "PO-2026-0001 received", read: true },
    ]);

    // Seed orders
    this.mockStore.seed("orders", [
      {
        id: "order-001", companyId: "company-dev-001", orderNumber: "ORD-2026-0001",
        customerId: "user-customer-001", customerName: "John Doe",
        items: [{ productId: "product-001", productName: "Fresh Cassava", quantity: 10, price: 200 }],
        subtotal: 2000, discount: 0, tax: 0, grandTotal: 2000, currency: "USD",
        status: "COMPLETED", paymentStatus: "PAID",
        statusHistory: [{ status: "PENDING", timestamp: "2026-08-20T10:00:00Z" }, { status: "COMPLETED", timestamp: "2026-08-22T14:00:00Z" }],
      },
    ]);

    // Seed community groups
    this.mockStore.seed("groups", [
      {
        id: "group-001",
        name: "Budidaya Singkong Berkualitas",
        description: "Grup diskusi tentang teknik budidaya singkong yang baik dan benar, mulai dari persiapan lahan hingga panen.",
        topic: "CULTIVATION",
        visibility: "PUBLIC",
        rules: "1. Tetap santun dan sopan\n2. Tidak spam atau promosi berlebihan\n3. Bahas sesuai topik budidaya singkong\n4. Dilarang membagikan konten ilegal",
        creatorId: "user-admin-001",
        companyId: "company-dev-001",
        status: "ACTIVE",
        memberCount: 3,
        createdAt: "2026-08-15T10:00:00Z",
      },
      {
        id: "group-002",
        name: "Kualitas & Standar Singkong Ekspor",
        description: "Diskusi tentang standar kualitas singkong untuk ekspor, sertifikasi, dan persyaratan pasar internasional.",
        topic: "QUALITY",
        visibility: "PUBLIC",
        rules: "1. Fokus pada standar kualitas\n2. Bagikan pengalaman ekspor\n3. Tidak membocorkan data rahasia perusahaan",
        creatorId: "user-manager-001",
        companyId: "company-dev-001",
        status: "ACTIVE",
        memberCount: 2,
        createdAt: "2026-08-20T14:00:00Z",
      },
      {
        id: "group-003",
        name: "Teknologi Pengolahan Singkong Modern",
        description: "Ruang bagi pengusaha dan peneliti untuk berbagi inovasi teknologi pengolahan singkong.",
        topic: "TECHNOLOGY",
        visibility: "PRIVATE",
        rules: "1. Hanya untuk praktisi industri\n2. Dilarang membocorkan trade secret\n3. Diskusi teknis mendalam",
        creatorId: "user-admin-001",
        companyId: "company-dev-001",
        status: "ACTIVE",
        memberCount: 2,
        createdAt: "2026-08-25T09:00:00Z",
      },
    ]);

    // Seed group members
    this.mockStore.seed("groupMembers", [
      {
        id: "gm-001",
        groupId: "group-001",
        userId: "user-admin-001",
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: "2026-08-15T10:00:00Z",
      },
      {
        id: "gm-002",
        groupId: "group-001",
        userId: "user-manager-001",
        role: "ADMIN",
        status: "ACTIVE",
        joinedAt: "2026-08-15T11:00:00Z",
      },
      {
        id: "gm-003",
        groupId: "group-001",
        userId: "user-sales-001",
        role: "MEMBER",
        status: "ACTIVE",
        joinedAt: "2026-08-16T09:00:00Z",
      },
      {
        id: "gm-004",
        groupId: "group-002",
        userId: "user-manager-001",
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: "2026-08-20T14:00:00Z",
      },
      {
        id: "gm-005",
        groupId: "group-002",
        userId: "user-sales-001",
        role: "MEMBER",
        status: "ACTIVE",
        joinedAt: "2026-08-21T10:00:00Z",
      },
      {
        id: "gm-006",
        groupId: "group-003",
        userId: "user-admin-001",
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: "2026-08-25T09:00:00Z",
      },
      {
        id: "gm-007",
        groupId: "group-003",
        userId: "user-manager-001",
        role: "ADMIN",
        status: "ACTIVE",
        joinedAt: "2026-08-25T10:00:00Z",
      },
    ]);

    // Seed messages
    this.mockStore.seed("messages", [
      {
        id: "msg-001",
        groupId: "group-001",
        senderId: "user-admin-001",
        text: "Selamat datang di grup Budidaya Singkong Berkualitas! Silakan perkenalkan diri dan bagikan pengalaman budidaya Anda.",
        status: "SENT",
        createdAt: "2026-08-15T10:05:00Z",
      },
      {
        id: "msg-002",
        groupId: "group-001",
        senderId: "user-manager-001",
        text: "Halo semuanya! Saya Manager dari PT Indocassava Trading. Senang bergabung di komunitas ini.",
        status: "SENT",
        createdAt: "2026-08-15T11:15:00Z",
      },
      {
        id: "msg-003",
        groupId: "group-001",
        senderId: "user-sales-001",
        text: "Hai! Saya dari tim Sales. Ada tips budidaya singkong varietas baru yang tahan kekeringan?",
        status: "SENT",
        createdAt: "2026-08-16T09:30:00Z",
      },
      {
        id: "msg-004",
        groupId: "group-001",
        senderId: "user-admin-001",
        text: "Varietas Malang 6 dan Malang 8 cukup tahan kekeringan. Pastikan drainase baik ya!",
        status: "SENT",
        createdAt: "2026-08-16T10:00:00Z",
      },
      {
        id: "msg-005",
        groupId: "group-002",
        senderId: "user-manager-001",
        text: "Selamat datang di grup Kualitas & Standar Singkong Ekspor. Mari diskusikan standar internasional.",
        status: "SENT",
        createdAt: "2026-08-20T14:10:00Z",
      },
      {
        id: "msg-006",
        groupId: "group-002",
        senderId: "user-sales-001",
        text: "Apa syarat utama untuk ekspor ke pasar Cina?",
        status: "SENT",
        createdAt: "2026-08-21T10:30:00Z",
      },
    ]);

    // Count total seeded documents
    let totalDocs = 0;
    const collections = ["users", "companies", "categories", "products", "suppliers", "customers",
      "warehouses", "inventory", "purchaseOrders", "salesOrders", "shipments", "transactions", "notifications", "orders", "groups", "groupMembers", "messages"];
    collections.forEach((c) => {
      totalDocs += this.mockStore.count(c);
    });
    console.log(`  📊 ${totalDocs} documents seeded across ${collections.length} collections`);
  }

  isFirebaseReady(): boolean {
    return !!(this.firebaseApp && this.firestore);
  }

  getFirestore(): admin.firestore.Firestore {
    if (!this.firestore) {
      throw new Error("Firebase Firestore not initialized. Check your credentials in .env");
    }
    return this.firestore;
  }

  getAuth(): admin.auth.Auth {
    if (!this.firebaseApp) {
      throw new Error("Firebase Auth not initialized. Check your credentials in .env");
    }
    return this.firebaseApp.auth();
  }

  getStorage(): admin.storage.Storage {
    if (!this.firebaseApp) {
      throw new Error("Firebase Storage not initialized. Check your credentials in .env");
    }
    return this.firebaseApp.storage();
  }

  // ============================================
  // Firestore Helper Methods (with mock fallback)
  // ============================================

  async getDocument(collection: string, id: string): Promise<any | null> {
    if (this.isFirebaseReady()) {
      const doc = await this.firestore.collection(collection).doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }
    // Mock mode
    return this.mockStore.get(collection, id);
  }

  async getDocuments(
    collection: string,
    filters?: { field: string; operator: any; value: unknown }[],
    orderBy?: { field: string; direction: "asc" | "desc" },
    limit?: number,
  ): Promise<any[]> {
    if (this.isFirebaseReady()) {
      let query: admin.firestore.Query = this.firestore.collection(collection);
      if (filters) {
        for (const filter of filters) {
          query = query.where(filter.field, filter.operator, filter.value);
        }
      }
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction);
      }
      if (limit) {
        query = query.limit(limit);
      }
      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    // Mock mode
    return this.mockStore.getAll(collection, filters as any, orderBy, limit);
  }

  async createDocument(
    collection: string,
    data: any,
  ): Promise<string> {
    if (this.isFirebaseReady()) {
      const docRef = await this.firestore.collection(collection).add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return docRef.id;
    }
    // Mock mode
    return this.mockStore.create(collection, data);
  }

  async updateDocument(
    collection: string,
    id: string,
    data: any,
  ): Promise<void> {
    if (this.isFirebaseReady()) {
      await this.firestore.collection(collection).doc(id).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }
    // Mock mode
    this.mockStore.update(collection, id, data);
  }

  async deleteDocument(collection: string, id: string): Promise<void> {
    if (this.isFirebaseReady()) {
      await this.firestore.collection(collection).doc(id).delete();
      return;
    }
    // Mock mode
    this.mockStore.delete(collection, id);
  }

  async countDocuments(
    collection: string,
    filters?: { field: string; operator: any; value: unknown }[],
  ): Promise<number> {
    if (this.isFirebaseReady()) {
      let query: admin.firestore.Query = this.firestore.collection(collection);
      if (filters) {
        for (const filter of filters) {
          query = query.where(filter.field, filter.operator, filter.value);
        }
      }
      const snapshot = await query.count().get();
      return snapshot.data().count;
    }
    // Mock mode
    return this.mockStore.count(collection, filters as any);
  }
}
