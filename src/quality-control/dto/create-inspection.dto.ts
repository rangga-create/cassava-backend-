import { IsString, IsNumber, IsOptional, Min, Max } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateInspectionDto {
  @ApiProperty({ description: "Batch ID" })
  @IsString()
  batchId: string;

  @ApiProperty({ description: "Supplier ID" })
  @IsString()
  supplierId: string;

  @ApiPropertyOptional({ description: "Purchase Order ID" })
  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @ApiProperty({ description: "Product ID" })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: "Warehouse ID" })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiProperty({ description: "Moisture content (%)", example: 12 })
  @IsNumber()
  @Min(0)
  @Max(100)
  moisture: number;

  @ApiProperty({ description: "Starch content (%)", example: 75 })
  @IsNumber()
  @Min(0)
  @Max(100)
  starchContent: number;

  @ApiProperty({ description: "Impurity level (%)", example: 2 })
  @IsNumber()
  @Min(0)
  @Max(100)
  impurity: number;

  @ApiProperty({ description: "Damage level (%)", example: 1 })
  @IsNumber()
  @Min(0)
  @Max(100)
  damage: number;

  @ApiProperty({ description: "Color", example: "White" })
  @IsString()
  color: string;

  @ApiProperty({ description: "Size", example: "Medium" })
  @IsString()
  size: string;

  @ApiProperty({ description: "Freshness score (0-100)", example: 85 })
  @IsNumber()
  @Min(0)
  @Max(100)
  freshness: number;

  @ApiProperty({ description: "Grade", example: "A" })
  @IsString()
  grade: string;

  @ApiPropertyOptional({ description: "Inspector name" })
  @IsOptional()
  @IsString()
  inspector?: string;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
