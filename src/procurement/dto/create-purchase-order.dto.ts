import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: "Supplier ID" })
  @IsString()
  supplierId: string;

  @ApiPropertyOptional({ description: "Supplier name" })
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiProperty({ description: "Product ID" })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: "Product name" })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiProperty({ description: "Quantity", example: 100 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: "Unit", example: "MT" })
  @IsString()
  unit: string;

  @ApiProperty({ description: "Price per unit", example: 150 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: "Expected delivery date" })
  @IsOptional()
  @IsString()
  expectedDelivery?: string;

  @ApiPropertyOptional({ description: "Payment terms" })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
