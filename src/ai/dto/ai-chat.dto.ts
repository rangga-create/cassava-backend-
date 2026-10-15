import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum AnalysisType {
  PRICE_NEGOTIATION = "price_negotiation",
  INVENTORY_OPTIMIZATION = "inventory_optimization",
  SUPPLIER_PERFORMANCE = "supplier_performance",
  SALES_FORECASTING = "sales_forecasting",
  PROFITABILITY_INSIGHTS = "profitability_insights",
  RISK_ALERTS = "risk_alerts",
  GENERAL_QA = "general_qa",
}

export class ChatMessageDto {
  @ApiProperty({ example: "user" })
  @IsString()
  role: "user" | "assistant" | "system";

  @ApiProperty({ example: "What's the best price for Fresh Cassava?" })
  @IsString()
  content: string;
}

export class ChatRequestDto {
  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional({ enum: AnalysisType })
  @IsOptional()
  @IsEnum(AnalysisType)
  analysisType?: AnalysisType;

  @ApiPropertyOptional({ example: "company-dev-001" })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ example: "product-001" })
  @IsOptional()
  @IsString()
  contextId?: string;
}

export class AnalysisRequestDto {
  @ApiProperty({ enum: AnalysisType })
  @IsEnum(AnalysisType)
  type: AnalysisType;

  @ApiPropertyOptional({ example: "company-dev-001" })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ example: "product-001" })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ example: "supplier-001" })
  @IsOptional()
  @IsString()
  relatedEntityId?: string;

  @ApiPropertyOptional({ example: "What's the best negotiation strategy?" })
  @IsOptional()
  @IsString()
  question?: string;
}

export class ChatResponseDto {
  @ApiProperty({ example: "Based on current market data..." })
  @IsString()
  response: string;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  suggestions?: string[];
}

export class AnalysisResponseDto {
  @ApiProperty({ example: "price_negotiation" })
  @IsString()
  type: string;

  @ApiProperty({ example: "Based on current market rates..." })
  @IsString()
  summary: string;

  @ApiProperty({ type: "object", additionalProperties: true })
  details: Record<string, any>;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  metrics?: Record<string, number>;
}