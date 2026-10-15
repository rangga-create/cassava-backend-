import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateSalesOrderDto {
  @ApiProperty({ description: "Customer ID" })
  @IsString()
  customerId: string;

  @ApiProperty({ description: "Product ID" })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: "Batch ID" })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiProperty({ description: "Quantity", example: 100 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: "Price per unit", example: 500 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: "Currency", default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: "Incoterm", example: "FOB" })
  @IsOptional()
  @IsString()
  incoterm?: string;

  @ApiPropertyOptional({ description: "Payment terms", example: "Net 30" })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
