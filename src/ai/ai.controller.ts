import { Controller, Post, Body, Get, Query, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AiService } from "./ai.service";
import {
  ChatRequestDto,
  AnalysisRequestDto,
  ChatResponseDto,
  AnalysisResponseDto,
  AnalysisType,
} from "./dto/ai-chat.dto";

@ApiTags("AI Assistant")
@ApiBearerAuth()
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("chat")
  @ApiOperation({ summary: "Chat with CASSAVA AI assistant" })
  @ApiResponse({ status: 200, type: ChatResponseDto })
  async chat(@Body() request: ChatRequestDto): Promise<ChatResponseDto> {
    return this.aiService.chat(request);
  }

  @Post("analyze")
  @ApiOperation({ summary: "Run specialized business analysis" })
  @ApiResponse({ status: 200, type: AnalysisResponseDto })
  async analyze(@Body() request: AnalysisRequestDto): Promise<AnalysisResponseDto> {
    return this.aiService.analyze(request);
  }

  @Get("analysis-types")
  @ApiOperation({ summary: "Get available analysis types" })
  @ApiResponse({ status: 200, type: [String] })
  getAnalysisTypes(): AnalysisType[] {
    return Object.values(AnalysisType);
  }

  @Post("price-negotiation")
  @ApiOperation({ summary: "Quick price negotiation analysis" })
  @ApiResponse({ status: 200, type: AnalysisResponseDto })
  async priceNegotiation(
    @Body() body: { companyId?: string; productId: string; customerId?: string; question?: string },
  ): Promise<AnalysisResponseDto> {
    return this.aiService.analyze({
      type: AnalysisType.PRICE_NEGOTIATION,
      companyId: body.companyId,
      entityId: body.productId,
      relatedEntityId: body.customerId,
      question: body.question,
    });
  }

  @Post("inventory-optimization")
  @ApiOperation({ summary: "Quick inventory optimization analysis" })
  @ApiResponse({ status: 200, type: AnalysisResponseDto })
  async inventoryOptimization(
    @Body() body: { companyId?: string; productId?: string; question?: string },
  ): Promise<AnalysisResponseDto> {
    return this.aiService.analyze({
      type: AnalysisType.INVENTORY_OPTIMIZATION,
      companyId: body.companyId,
      entityId: body.productId,
      question: body.question,
    });
  }

  @Post("supplier-performance")
  @ApiOperation({ summary: "Quick supplier performance analysis" })
  @ApiResponse({ status: 200, type: AnalysisResponseDto })
  async supplierPerformance(
    @Body() body: { companyId?: string; supplierId: string; question?: string },
  ): Promise<AnalysisResponseDto> {
    return this.aiService.analyze({
      type: AnalysisType.SUPPLIER_PERFORMANCE,
      companyId: body.companyId,
      entityId: body.supplierId,
      question: body.question,
    });
  }

  @Post("sales-forecasting")
  @ApiOperation({ summary: "Quick sales forecasting analysis" })
  @ApiResponse({ status: 200, type: AnalysisResponseDto })
  async salesForecasting(
    @Body() body: { companyId?: string; customerId?: string; question?: string },
  ): Promise<AnalysisResponseDto> {
    return this.aiService.analyze({
      type: AnalysisType.SALES_FORECASTING,
      companyId: body.companyId,
      entityId: body.customerId,
      question: body.question,
    });
  }

  @Post("profitability")
  @ApiOperation({ summary: "Quick profitability analysis" })
  @ApiResponse({ status: 200, type: AnalysisResponseDto })
  async profitability(
    @Body() body: { companyId?: string; productId?: string; customerId?: string; question?: string },
  ): Promise<AnalysisResponseDto> {
    return this.aiService.analyze({
      type: AnalysisType.PROFITABILITY_INSIGHTS,
      companyId: body.companyId,
      entityId: body.productId,
      relatedEntityId: body.customerId,
      question: body.question,
    });
  }

  @Post("risk-alerts")
  @ApiOperation({ summary: "Quick risk assessment" })
  @ApiResponse({ status: 200, type: AnalysisResponseDto })
  async riskAlerts(
    @Body() body: { companyId?: string; question?: string },
  ): Promise<AnalysisResponseDto> {
    return this.aiService.analyze({
      type: AnalysisType.RISK_ALERTS,
      companyId: body.companyId,
      question: body.question,
    });
  }
}