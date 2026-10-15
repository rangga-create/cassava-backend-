import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Groq } from "groq-sdk";
import { FirebaseService } from "../common/services/firebase.service";
import {
  AnalysisType,
  ChatMessageDto,
  ChatRequestDto,
  AnalysisRequestDto,
  ChatResponseDto,
  AnalysisResponseDto,
} from "./dto/ai-chat.dto";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly groq: Groq;
  private readonly model = "openai/gpt-oss-120b";
  /** Dipakai kalau model utama error/rate-limit */
  private readonly fallbackModel = "openai/gpt-oss-20b";
  /** Mock HANYA kalau GROQ_API_KEY benar-benar tidak ada — dev mode tetap pakai AI asli */
  private readonly useMock: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly firebaseService: FirebaseService,
  ) {
    const apiKey =
      this.configService.get<string>("GROQ_API_KEY") || process.env.GROQ_API_KEY || "";
    this.useMock = !apiKey.trim();
    if (this.useMock) {
      this.logger.warn("Using mock AI responses (GROQ_API_KEY not configured)");
    } else {
      this.logger.log("CASSAVA AI connected to Groq (real AI responses enabled)");
    }
    this.groq = new Groq({ apiKey });
  }

  async chat(request: ChatRequestDto): Promise<ChatResponseDto> {
    if (this.useMock) {
      return this.getMockChatResponse(request);
    }

    try {
      const companyId = request.companyId || "company-dev-001";
      const context = await this.buildContext(companyId, request.contextId, request.analysisType);

      const systemPrompt = this.buildSystemPrompt(request.analysisType, context);
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...request.messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const completion = await this.createChatCompletion(messages, {
        temperature: 0.3,
        maxTokens: 2000,
      });

      const response = completion.choices[0]?.message?.content || "I couldn't generate a response.";

      return {
        response,
        suggestions: this.generateSuggestions(request.analysisType),
      };
    } catch (error) {
      this.logger.error("Chat failed", error);
      return {
        response: "I'm experiencing technical difficulties. Please try again later.",
        suggestions: ["Try a simpler question", "Check your internet connection"],
      };
    }
  }

  /**
   * Panggil model utama; kalau gagal (model decommissioned/rate limit), coba
   * model fallback supaya user tidak pernah lihat error mentah.
   */
  private async createChatCompletion(
    messages: Array<{ role: string; content: string }>,
    opts: { temperature: number; maxTokens: number; jsonMode?: boolean },
  ) {
    const base = {
      messages: messages as any,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      ...(opts.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    };

    try {
      return await this.groq.chat.completions.create({ model: this.model, ...base });
    } catch (primaryError: any) {
      this.logger.warn(
        `Primary model "${this.model}" failed (${primaryError?.message || primaryError}); trying fallback "${this.fallbackModel}"`,
      );
      return await this.groq.chat.completions.create({ model: this.fallbackModel, ...base });
    }
  }

  private getMockChatResponse(request: ChatRequestDto): ChatResponseDto {
    const userMessage = request.messages[request.messages.length - 1]?.content?.toLowerCase() || "";
    const analysisType = request.analysisType || "general_qa";
    const isFirstMessage = request.messages.length === 1;

    if (isFirstMessage && (userMessage === "halo" || userMessage === "hi" || userMessage === "hai" || userMessage === "hello")) {
      return {
        response: `Halo! 👋 Ada yang bisa saya bantu hari ini soal bisnis cassava?

Kalo mau tanya harga, stok, supplier, atau laporan keuangan — coba aja ketik pertanyaannya. Atau pilih kategori di dropdown biar lebih fokus.`,
        suggestions: this.generateSuggestions(analysisType as AnalysisType),
      };
    }

    let response = "";

    if (userMessage.includes("murah") || userMessage.includes("10$") || userMessage.includes("10 $") || userMessage.includes("lebih murah") || userMessage.includes("diskon") || userMessage.includes("harga pas")) {
      response = `Jujur aja ya — harga $10/MT **gak mungkin** 😅

Harga beli petani sudah $380/MT, ditambah transport + processing. Jadi floor price kita sekitar **$400-420/MT** (volume >500 MT/bulan, cash).

Yang realistis:
- **$400-420/MT** — beli grosir, commitment bulanan
- **$470/MT** — walk away price (di atas ini rugi)
- **Grade B/C** — bisa $380-400/MT kalo mau kualitas lebih rendah

Kalo budget terbatas, bisa pertimbangin **Cassava Flour** (proses lebih, tapi per kg bisa lebih hemat) atau beli volume kecil (<50 MT) harga retail ~$500-550/MT.

Mau saya bantu hitung estimasi biaya untuk volume berapa?`;
    } else if (userMessage.includes("tangerang") || userMessage.includes("lokasi") || userMessage.includes("area") || userMessage.includes("kirim") || userMessage.includes("delivery")) {
      response = `Tangerang bukan area produksi cassava ya, jadi dari sini (Surabaya/Lampung) harus dikirim dulu.

**Estimasi kirim ke Tangerang:**
- Dari Lampung: ~$25-30/MT (truk + feri), 3-4 hari
- Dari Jawa Barat: ~$15-20/MT, 2-3 hari
- Dari Surabaya: ~$35/MT, 4-5 hari

Gudang kami terdekat di **Jakarta Barat** — cuma 15 km dari Tangerang. Bisa **pickup sendiri** atau kami **antar** (biaya tambah ~$5-8/MT).

Mau saya cek jadwal pengiriman minggu ini?`;
    } else if (userMessage.includes("kas") || userMessage.includes("cash") || userMessage.includes("uang") || userMessage.includes("dana") || userMessage.includes("modal")) {
      response = `**Posisi Kas (Oktober 2026):**

💰 Cash on hand: **$1.2M**
📉 Burn rate: ~$300K/bulan
⏱️ Runway: **4 bulan** (aman untuk now)

**Arus kas bulan ini:**
- Masuk: $1.5M (piutang + COD)
- Keluar: $1.3M (beli cassava, operasional, bayar hutang)
- Net: **+$200K** ✅

**Perhatian:**
- Piutang tertagih: $890K (termasuk PT Indofood $450K overdue 60+ hari)
- Hutang bayar supplier: $560K (due 30-45 hari)

Butuh analisis cash flow detail atau projections 3 bulan ke depan?`;
    } else if (userMessage.includes("piutang") || userMessage.includes("tagih") || userMessage.includes("kolek") || userMessage.includes("receivable")) {
      response = `**Piutang Tertagih (Aging):**

🔴 **Overdue >60 hari:** PT Indofood — **$450K** (perlu follow up keras)
🟡 **Overdue 30-60 hari:** CV Boga Sari — **$120K** (sudah janji bayar minggu depan)
🟢 **Current:** $320K (bayar lancar)

Total: **$890K**

**Rekomendasi:**
1. Indofood → kirim *collection letter* formal + telpon ke finance director
2. Boga Sari → confirm tanggal bayar pasti
3. Pertimbangin *factoring* kalo butuh cash cepat

Mau saya bantu draft surat tagihan ke Indofood?`;
    } else if (userMessage.includes("hutang") || userMessage.includes("bayar supplier") || userMessage.includes("payable")) {
      response = `**Hutang Bayar Supplier:**

📋 **Total:** $560K
- PT Cassava Prima: $280K (Net 30, due 15 Nov)
- CV Sumber Rejeki: $180K (Net 15, due 10 Nov) — **prioritas**
- UD Bina Tani: $100K (Net 45, due 25 Nov)

**Cash flow check:** Penerimaan $1.5M > Pengeluaran $1.3M = aman bayar tepat waktu.

Mau saya buat jadwal pembayaran mingguan?`;
    } else if (userMessage.includes("stok") || userMessage.includes("inventory") || userMessage.includes("persediaan") || userMessage.includes("stock")) {
      response = `**Status Stok Saat Ini:**

| Produk | Stok | Nilai | Days Supply | Status |
|--------|------|-------|-------------|--------|
| Fresh Cassava | 1,250 MT | $525K | 18 hari | ✅ Aman |
| Cassava Flour | 380 MT | $228K | 45 hari | ⚠️ Overstock |
| Tapioca Starch | 95 MT | $76K | 8 hari | 🔴 **Reorder urgent** |
| Cassava Chips | 2,100 MT | $840K | 35 hari | ✅ Aman |

**Action items:**
1. **Tapioca Starch** → PO 200 MT ke PT Cassava Prima (ROP: 150 MT)
2. **Cassava Flour** → kurangi produksi sampai stok <200 MT
3. Gudang utilization 78% — masih muat 500 MT

Mau saya bikin PO draft buat Tapioca Starch?`;
    } else if (userMessage.includes("supplier") || userMessage.includes("pemasok") || userMessage.includes("vendor")) {
      response = `**Ranking Supplier (Total Cost of Ownership):**

1. **PT Cassava Prima** ⭐⭐⭐⭐⭐
   - Quality: 96% | On-time: 94% | Defect: 0.8%
   - Harga: $410/MT | Terms: Net 30 | Spend: $2.1M
   - *Best overall, tapi single source untuk Tapioca Starch*

2. **CV Sumber Rejeki** ⭐⭐⭐⭐
   - Quality: 91% | On-time: 87% | Defect: 2.1%
   - Harga: $395/MT | Terms: Net 15 | Spend: $1.4M
   - *Harga bagus, tapi on-time turun lately*

3. **UD Bina Tani** ⭐⭐⭐
   - Quality: 85% | On-time: 78% | Defect: 4.2%
   - Harga: $380/MT | Terms: Net 45 | Spend: $890K
   - *Murah tapi risky*

**Strategi:** Negosiasi terms Cassava Prima ke Net 45, cari backup supplier Tapioca Starch, set improvement plan untuk Bina Tani.

Mau detail performa supplier mana?`;
    } else if (userMessage.includes("penawaran") || userMessage.includes("offer") || userMessage.includes("quo") || userMessage.includes("proposal")) {
      response = `Siap! Buat bikin penawaran (quotation) butuh info:

**Customer:** Siapa? (Company name / kontak person)
**Produk:** Fresh Cassava / Cassava Flour / Tapioca Starch / Cassava Chips
**Grade:** A / B / C
**Volume:** Berapa MT / bulan?
**Term:** FOB Surabaya / CIF [port tujuan] / Ex-warehouse
**Payment:** Cash / Net 15 / Net 30 / LC
**Delivery:** Kapan mulai? Berapa MT per shipment?

Kalo udah punya data customer, saya bantu hitung:
- Harga jual recommended (berdasar margin target 15-25%)
- Walk-away price
- Estimasi margin kotor & bersih
- Risk assessment (credit, FX, volume)

Mau coba isi datanya?`;
    } else if (analysisType === "price_negotiation" || userMessage.includes("harga") || userMessage.includes("price") || userMessage.includes("nego")) {
      response = `**Harga Pasar Fresh Cassava Grade A (Oktober 2026):**

📊 **Benchmark:**
- Beli (FOB Surabaya): **$420-450/MT**
- Jual (CIF China/Vietnam): **$520-580/MT**
- Margin kotor: **~$100-130/MT** (18-25%)

**Buat negosiasi beli:**
- Target: **$400-410/MT** (volume >500 MT/bln, cash)
- Walk-away: **$470/MT**

**Buat negosiasi jual ke China Foods:**
- Target: **$560-570/MT**
- Walk-away: **$510/MT**

**Leverage kita:** Volume stabil, bayar cash, relasi lama. Tapi mereka tahu kita butuh volume → jangan terlalu agresif.

Mau saya bantu simulasikan skenario negosiasi tertentu?`;
    } else if (analysisType === "general_qa" || userMessage === "") {
      response = this.buildRequestAwareFallback(request.messages);
    } else {
      response = this.buildRequestAwareFallback(request.messages);
    }

    return {
      response,
      suggestions: this.generateSuggestions(analysisType as AnalysisType),
    };
  }

  /**
   * Fallback mock yang menyadari permintaan user — mengulang apa yang diminta
   * + melangkah ke aksi konkret, bukan mengulang intro berulang-ulang.
   */
  private buildRequestAwareFallback(messages: ChatMessageDto[]): string {
    const rawMessage = messages[messages.length - 1]?.content?.trim() || "pertanyaan bisnis kamu";
    const isFollowUp = messages.length > 1;

    return `Oke, saya catat permintaan kamu: **“${rawMessage}”** 📝${
      isFollowUp ? "\n\n(Lanjutan dari obrolan kita ya — konteksnya saya simpan.)" : ""
    }

Biar jawabannya tepat sasaran, konfirmasi 3 hal ini dulu ya:
1. **Objeknya** — produk, supplier, customer, atau keuangan yang dimaksud?
2. **Bentuk jawabannya** — ranking/data, rekomendasi langkah, angka estimasi, atau draft dokumen?
3. **Konteks khusus** — budget, kualitas tertentu, volume, atau timeline?

Sambil menunggu konfirmasi, ini info cepat dari data Indo Cassava Trading:
- Supplier terbaik: **PT Cassava Prima** (quality 96%, on-time 94%)
- Produk yang butuh reorder: **Tapioca Starch** (sisa 8 hari)
- Kapasitas gudang: 78% terpakai (masih muat ~500 MT)

Balas saja dengan detail tambahan, saya langsung lanjut analisisnya 💪`;
  }

  async analyze(request: AnalysisRequestDto): Promise<AnalysisResponseDto> {
    if (this.useMock) {
      return this.getMockAnalysisResponse(request);
    }

    try {
      const companyId = request.companyId || "company-dev-001";
      const context = await this.buildContext(companyId, request.entityId, request.type, request.relatedEntityId);

      const prompt = this.buildAnalysisPrompt(request.type, context, request.question);
      const messages = [{ role: "system" as const, content: prompt }];

      const completion = await this.createChatCompletion(messages, {
        temperature: 0.2,
        maxTokens: 3000,
        jsonMode: true,
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || "{}");

      return {
        type: request.type,
        summary: result.summary || "Analysis completed",
        details: result.details || {},
        recommendations: result.recommendations || [],
        metrics: result.metrics || {},
      };
    } catch (error) {
      this.logger.error(`Analysis failed for ${request.type}`, error);
      return this.getFallbackAnalysis(request.type);
    }
  }

  private getMockAnalysisResponse(request: AnalysisRequestDto): AnalysisResponseDto {
    const mockAnalyses: Record<string, AnalysisResponseDto> = {
      price_negotiation: {
        type: "price_negotiation",
        summary: "Fresh Cassava (Grade A) - Strong buyer position with volume leverage",
        details: {
          currentBuyPrice: 420,
          currentSellPrice: 550,
          marketBenchmark: 480,
          margin: 130,
          volumeLeverage: "high",
          competitorPricing: "Competitors buying at $430-450, selling at $530-570",
        },
        recommendations: [
          "Target buy price: $400-410/MT for 500+ MT/month commitment",
          "Walk-away buy: $470/MT",
          "Target sell price: $560-570/MT to China Foods",
          "Walk-away sell: $510/MT",
        ],
        metrics: {
          targetBuyPrice: 405,
          targetSellPrice: 565,
          walkAwayBuy: 470,
          walkAwaySell: 510,
        },
      },
      inventory_optimization: {
        type: "inventory_optimization",
        summary: "Inventory healthy overall, Tapioca Starch needs urgent reorder",
        details: {
          totalStockValue: 1669000,
          turnoverRate: 6.2,
          daysOfSupply: 27,
          stockoutRisk: "medium",
          overstockItems: ["Cassava Flour (380 MT, 45 days supply)"],
          understockItems: ["Tapioca Starch (95 MT, 8 days supply)"],
        },
        recommendations: [
          "Reorder Tapioca Starch: 200 MT immediately (ROP: 150 MT)",
          "Reduce Cassava Flour production until stock <200 MT",
          "Optimize warehouse layout for 500 MT additional capacity",
        ],
        metrics: {
          optimalReorderPoint: 150,
          safetyStock: 50,
          eoq: 200,
        },
      },
      supplier_performance: {
        type: "supplier_performance",
        summary: "PT Cassava Prima leads, UD Bina Tani needs improvement",
        details: {
          qualityScore: 96,
          reliabilityScore: 94,
          onTimeDeliveryRate: 94,
          defectRate: 0.8,
          totalSpend: 2100000,
          paymentTerms: "Net 30",
        },
        recommendations: [
          "Negotiate Net 45 terms with PT Cassava Prima",
          "Qualify 2nd Tapioca Starch supplier for risk mitigation",
          "Set improvement plan for UD Bina Tani (target 90% on-time)",
        ],
        metrics: {
          ranking: 1,
          costPerUnit: 410,
          riskScore: 15,
        },
      },
      sales_forecasting: {
        type: "sales_forecasting",
        summary: "Q1 2026 forecast: $4.5M revenue, driven by China demand",
        details: {
          historicalAvgMonthly: 1633,
          seasonalityFactor: 1.15,
          pipelineValue: 3200000,
          conversionRate: 0.72,
          topProducts: ["Fresh Cassava", "Cassava Chips", "Tapioca Starch"],
          growthTrend: "up",
        },
        recommendations: [
          "Lock Q1 contracts with China Foods Import by Nov 15",
          "Push Cassava Chips for Chinese New Year seasonal demand",
          "Explore new Vietnam market for Tapioca Starch",
        ],
        metrics: {
          nextMonthForecast: 1800,
          nextQuarterForecast: 4900,
          confidenceInterval: 0.75,
        },
      },
      profitability_insights: {
        type: "profitability_insights",
        summary: "Tapioca Starch highest margin (30%), Fresh Cassava volume driver",
        details: {
          grossMargin: 24.5,
          netMargin: 15.8,
          byProduct: {
            "Fresh Cassava": { revenue: 2100000, margin: 20 },
            "Cassava Flour": { revenue: 1400000, margin: 25 },
            "Tapioca Starch": { revenue: 890000, margin: 30 },
            "Cassava Chips": { revenue: 1800000, margin: 25 },
          },
          byCustomer: {
            "China Foods Import": { revenue: 3200000, margin: 18 },
            "Vietnam Starch Co": { revenue: 1800000, margin: 22 },
          },
          byRoute: {
            "Export China": { revenue: 3500000, margin: 19 },
            "Export Vietnam": { revenue: 1800000, margin: 22 },
            "Domestic": { revenue: 890000, margin: 28 },
          },
          costBreakdown: {
            purchase: 65,
            processing: 12,
            logistics: 15,
            overhead: 8,
          },
        },
        recommendations: [
          "Increase Tapioca Starch allocation to premium domestic buyers",
          "Optimize Fresh Cassava logistics (target -$10/MT shipping)",
          "Negotiate better processing rates for volume >2000 MT/month",
        ],
        metrics: {
          overallMargin: 15.8,
          bestMarginProduct: 3,
          worstMarginProduct: 0,
          improvementPotential: 3.2,
        },
      },
      risk_alerts: {
        type: "risk_alerts",
        summary: "3 High risks: single-source Tapioca, overdue receivables, aging inventory",
        details: {
          creditRisks: [
            { customer: "PT Indofood", overdue: 450000, days: 65, action: "Collection letter sent" },
            { customer: "CV Boga Sari", overdue: 120000, days: 45, action: "Payment plan agreed" },
          ],
          supplyRisks: [
            { item: "Tapioca Starch", risk: "Single source (PT Cassava Prima)", impact: "High" },
            { item: "Fresh Cassava Grade A", risk: "Seasonal supply Q1", impact: "Medium" },
          ],
          priceRisks: [
            { factor: "USD/IDR FX", exposure: "50% revenue USD", impact: "Medium" },
            { factor: "Cassava Chips global price", volatility: "±15%", impact: "Medium" },
          ],
          operationalRisks: [
            { item: "Cassava Flour aging", qty: 120, value: 72000, days: 120 },
            { item: "Warehouse capacity", utilization: 78, trend: "increasing" },
          ],
          complianceRisks: [],
        },
        recommendations: [
          "Qualify backup Tapioca Starch supplier by Dec 31",
          "Escalate PT Indofood to legal collection",
          "Run Cassava Flour aging promotion (discount 10%)",
          "Hedge 50% USD exposure via forward contracts",
        ],
        metrics: {
          overallRiskScore: 42,
          highRiskCount: 3,
          mediumRiskCount: 5,
          exposureAmount: 642000,
        },
      },
      general_qa: {
        type: "general_qa",
        summary: "Business overview: $1.5M monthly revenue, healthy cash position",
        details: {
          keyFindings: [
            "Cash runway: 4 months at current burn",
            "Inventory turn: 6.2x annually",
            "Top 3 customers = 65% revenue",
            "Export ratio: 78% of revenue",
          ],
        },
        recommendations: [
          "Diversify customer base (target <50% top 3)",
          "Build 2nd supplier for each critical product",
          "Improve inventory turnover to 8x",
        ],
        metrics: {},
      },
    };

    return mockAnalyses[request.type] || mockAnalyses.general_qa;
  }

  private async buildContext(
    companyId: string,
    entityId?: string,
    analysisType?: AnalysisType,
    relatedEntityId?: string,
  ): Promise<Record<string, any>> {
    const context: Record<string, any> = { companyId };

    try {
      const [
        company,
        products,
        inventory,
        suppliers,
        customers,
        purchaseOrders,
        salesOrders,
        shipments,
        transactions,
        warehouses,
      ] = await Promise.all([
        this.firebaseService.getDocument("companies", companyId),
        this.firebaseService.getDocuments("products", [{ field: "companyId", operator: "==", value: companyId }]),
        this.firebaseService.getDocuments("inventory", [{ field: "companyId", operator: "==", value: companyId }]),
        this.firebaseService.getDocuments("suppliers", [{ field: "companyId", operator: "==", value: companyId }]),
        this.firebaseService.getDocuments("customers", [{ field: "companyId", operator: "==", value: companyId }]),
        this.firebaseService.getDocuments("purchaseOrders", [{ field: "companyId", operator: "==", value: companyId }]),
        this.firebaseService.getDocuments("salesOrders", [{ field: "companyId", operator: "==", value: companyId }]),
        this.firebaseService.getDocuments("shipments", [{ field: "companyId", operator: "==", value: companyId }]),
        this.firebaseService.getDocuments("transactions", [{ field: "companyId", operator: "==", value: companyId }]),
        this.firebaseService.getDocuments("warehouses", [{ field: "companyId", operator: "==", value: companyId }]),
      ]);

      context.company = company;
      context.products = products;
      context.inventory = inventory;
      context.suppliers = suppliers;
      context.customers = customers;
      context.purchaseOrders = purchaseOrders;
      context.salesOrders = salesOrders;
      context.shipments = shipments;
      context.transactions = transactions;
      context.warehouses = warehouses;

      if (entityId) {
        context.entity = await this.firebaseService.getDocument(
          this.getCollectionForAnalysisType(analysisType),
          entityId,
        );
      }

      if (relatedEntityId) {
        context.relatedEntity = await this.firebaseService.getDocument(
          this.getRelatedCollectionForAnalysisType(analysisType),
          relatedEntityId,
        );
      }
    } catch (error) {
      this.logger.warn("Failed to fetch some context data", error);
    }

    return context;
  }

  private getCollectionForAnalysisType(type?: AnalysisType): string {
    switch (type) {
      case AnalysisType.PRICE_NEGOTIATION:
      case AnalysisType.INVENTORY_OPTIMIZATION:
      case AnalysisType.PROFITABILITY_INSIGHTS:
        return "products";
      case AnalysisType.SUPPLIER_PERFORMANCE:
        return "suppliers";
      case AnalysisType.SALES_FORECASTING:
        return "customers";
      case AnalysisType.RISK_ALERTS:
        return "transactions";
      default:
        return "products";
    }
  }

  private getRelatedCollectionForAnalysisType(type?: AnalysisType): string {
    switch (type) {
      case AnalysisType.PRICE_NEGOTIATION:
        return "customers";
      case AnalysisType.SUPPLIER_PERFORMANCE:
        return "purchaseOrders";
      default:
        return "products";
    }
  }

  private buildSystemPrompt(analysisType?: AnalysisType, context?: Record<string, any>): string {
    const basePrompt = `You are CASSAVA AI, an expert business analyst for a cassava trading company (Indo Cassava Trading).

COMPANY CONTEXT:
- Company: ${context?.company?.name || "Indo Cassava Trading"}
- Industry: Agriculture & Trading (Cassava)
- Location: Surabaya, East Java, Indonesia
- Products: Fresh Cassava, Cassava Flour, Cassava Chips, Tapioca Starch, Cassava Pellets

CURRENT BUSINESS DATA:
${JSON.stringify(context, null, 2)}

GUIDELINES:
- Provide specific, actionable insights based on the data
- Use USD for currency, MT for quantities
- Reference actual product names, supplier names, customer names
- Be concise but comprehensive
- Focus on profitability, risk management, and operational efficiency`;

    switch (analysisType) {
      case AnalysisType.PRICE_NEGOTIATION:
        return `${basePrompt}

SPECIALIZATION: PRICE NEGOTIATION EXPERT
- Analyze buy/sell prices vs market rates
- Consider product grade, origin, volume, incoterms
- Factor in competitor pricing, seasonal trends
- Suggest target prices, walk-away points, concession strategies`;

      case AnalysisType.INVENTORY_OPTIMIZATION:
        return `${basePrompt}

SPECIALIZATION: INVENTORY OPTIMIZATION EXPERT
- Analyze stock levels, turnover rates, reorder points
- Consider warehouse capacity, product shelf life
- Factor in lead times, demand variability
- Suggest optimal stock levels, reorder quantities, safety stock`;

      case AnalysisType.SUPPLIER_PERFORMANCE:
        return `${basePrompt}

SPECIALIZATION: SUPPLIER PERFORMANCE ANALYST
- Evaluate quality scores, reliability, payment terms
- Analyze historical delivery performance, defect rates
- Compare total cost of ownership across suppliers
- Suggest supplier diversification, negotiation leverage`;

      case AnalysisType.SALES_FORECASTING:
        return `${basePrompt}

SPECIALIZATION: SALES FORECASTING EXPERT
- Analyze historical sales patterns, seasonality
- Consider customer purchase cycles, credit terms
- Factor in market demand, competitor activity
- Provide demand forecasts, revenue projections`;

      case AnalysisType.PROFITABILITY_INSIGHTS:
        return `${basePrompt}

SPECIALIZATION: PROFITABILITY ANALYST
- Calculate margins by product, customer, route
- Analyze cost structure: purchase, processing, logistics
- Identify high/low margin segments
- Suggest pricing adjustments, cost reduction`;

      case AnalysisType.RISK_ALERTS:
        return `${basePrompt}

SPECIALIZATION: RISK MANAGEMENT EXPERT
- Identify credit risk (customer outstanding, payment history)
- Supply risk (single source, geopolitical, quality)
- Price risk (commodity volatility, FX exposure)
- Operational risk (inventory aging, shipment delays)
- Provide early warnings, mitigation strategies`;

      default:
        return `${basePrompt}

SPECIALIZATION: GENERAL BUSINESS ASSISTANT
- Answer questions about any aspect of the business
- Provide data-driven insights and recommendations
- Explain complex trade dynamics in simple terms`;
    }
  }

  private buildAnalysisPrompt(
    type: AnalysisType,
    context: Record<string, any>,
    question?: string,
  ): string {
    const baseContext = JSON.stringify(context, null, 2);

    const prompts: Record<AnalysisType, string> = {
      [AnalysisType.PRICE_NEGOTIATION]: `Analyze price negotiation for ${context.entity?.name || "product"} with ${context.relatedEntity?.companyName || "counterparty"}.

CONTEXT:
${baseContext}

${question ? `SPECIFIC QUESTION: ${question}` : ""}

Return JSON with:
{
  "summary": "Executive summary of negotiation position",
  "details": {
    "currentBuyPrice": number,
    "currentSellPrice": number,
    "marketBenchmark": number,
    "margin": number,
    "volumeLeverage": "high|medium|low",
    "competitorPricing": "description"
  },
  "recommendations": ["specific actionable recommendations"],
  "metrics": {
    "targetBuyPrice": number,
    "targetSellPrice": number,
    "walkAwayBuy": number,
    "walkAwaySell": number
  }
}`,

      [AnalysisType.INVENTORY_OPTIMIZATION]: `Optimize inventory for ${context.entity?.name || "all products"}.

CONTEXT:
${baseContext}

${question ? `SPECIFIC QUESTION: ${question}` : ""}

Return JSON with:
{
  "summary": "Inventory health overview",
  "details": {
    "totalStockValue": number,
    "turnoverRate": number,
    "daysOfSupply": number,
    "stockoutRisk": "high|medium|low",
    "overstockItems": [],
    "understockItems": []
  },
  "recommendations": ["specific reorder actions"],
  "metrics": {
    "optimalReorderPoint": number,
    "safetyStock": number,
    "eoq": number
  }
}`,

      [AnalysisType.SUPPLIER_PERFORMANCE]: `Evaluate supplier performance for ${context.entity?.companyName || "all suppliers"}.

CONTEXT:
${baseContext}

${question ? `SPECIFIC QUESTION: ${question}` : ""}

Return JSON with:
{
  "summary": "Supplier performance summary",
  "details": {
    "qualityScore": number,
    "reliabilityScore": number,
    "onTimeDeliveryRate": number,
    "defectRate": number,
    "totalSpend": number,
    "paymentTerms": "string"
  },
  "recommendations": ["supplier management actions"],
  "metrics": {
    "ranking": number,
    "costPerUnit": number,
    "riskScore": number
  }
}`,

      [AnalysisType.SALES_FORECASTING]: `Forecast sales for ${context.entity?.companyName || "all customers"}.

CONTEXT:
${baseContext}

${question ? `SPECIFIC QUESTION: ${question}` : ""}

Return JSON with:
{
  "summary": "Sales forecast overview",
  "details": {
    "historicalAvgMonthly": number,
    "seasonalityFactor": number,
    "pipelineValue": number,
    "conversionRate": number,
    "topProducts": [],
    "growthTrend": "up|down|stable"
  },
  "recommendations": ["sales strategy actions"],
  "metrics": {
    "nextMonthForecast": number,
    "nextQuarterForecast": number,
    "confidenceInterval": "high|medium|low"
  }
}`,

      [AnalysisType.PROFITABILITY_INSIGHTS]: `Analyze profitability for ${context.entity?.name || "all products/customers"}.

CONTEXT:
${baseContext}

${question ? `SPECIFIC QUESTION: ${question}` : ""}

Return JSON with:
{
  "summary": "Profitability analysis summary",
  "details": {
    "grossMargin": number,
    "netMargin": number,
    "byProduct": {},
    "byCustomer": {},
    "byRoute": {},
    "costBreakdown": {}
  },
  "recommendations": ["margin improvement actions"],
  "metrics": {
    "overallMargin": number,
    "bestMarginProduct": "string",
    "worstMarginProduct": "string",
    "improvementPotential": number
  }
}`,

      [AnalysisType.RISK_ALERTS]: `Identify business risks across all areas.

CONTEXT:
${baseContext}

${question ? `SPECIFIC QUESTION: ${question}` : ""}

Return JSON with:
{
  "summary": "Risk assessment summary",
  "details": {
    "creditRisks": [],
    "supplyRisks": [],
    "priceRisks": [],
    "operationalRisks": [],
    "complianceRisks": []
  },
  "recommendations": ["risk mitigation actions"],
  "metrics": {
    "overallRiskScore": number,
    "highRiskCount": number,
    "mediumRiskCount": number,
    "exposureAmount": number
  }
}`,

      [AnalysisType.GENERAL_QA]: `Answer the business question using available data.

CONTEXT:
${baseContext}

QUESTION: ${question || "General business analysis"}

Return JSON with:
{
  "summary": "Direct answer to the question",
  "details": { "keyFindings": [] },
  "recommendations": ["actionable next steps"],
  "metrics": {}
}`,
    };

    return prompts[type] || prompts[AnalysisType.GENERAL_QA];
  }

  private generateSuggestions(analysisType?: AnalysisType): string[] {
    const suggestions: Record<AnalysisType, string[]> = {
      [AnalysisType.PRICE_NEGOTIATION]: [
        "Show me market benchmarks for Fresh Cassava",
        "What's my walk-away price for Cassava Flour?",
        "Analyze negotiation leverage with China Foods Import",
      ],
      [AnalysisType.INVENTORY_OPTIMIZATION]: [
        "Which products need reordering?",
        "Calculate optimal safety stock for Tapioca Starch",
        "Show warehouse capacity utilization",
      ],
      [AnalysisType.SUPPLIER_PERFORMANCE]: [
        "Rank suppliers by total cost of ownership",
        "Which supplier has best quality score?",
        "Analyze payment terms optimization",
      ],
      [AnalysisType.SALES_FORECASTING]: [
        "Forecast Q1 2026 revenue",
        "Which customer has highest growth potential?",
        "Predict seasonal demand for Cassava Chips",
      ],
      [AnalysisType.PROFITABILITY_INSIGHTS]: [
        "Show margin by product category",
        "Which customer is most profitable?",
        "Analyze shipping cost impact on margins",
      ],
      [AnalysisType.RISK_ALERTS]: [
        "Check customer credit exposure",
        "Identify single-source supplier risks",
        "Alert on inventory aging > 90 days",
      ],
      [AnalysisType.GENERAL_QA]: [
        "What's our current cash position?",
        "Summarize this month's performance",
        "Explain the cassava supply chain flow",
      ],
    };

    return suggestions[analysisType || AnalysisType.GENERAL_QA];
  }

  private getFallbackAnalysis(type: AnalysisType): AnalysisResponseDto {
    return {
      type,
      summary: `Analysis for ${type} temporarily unavailable`,
      details: { error: "AI service unavailable, using fallback" },
      recommendations: ["Try again in a moment", "Check system status"],
      metrics: {},
    };
  }
}