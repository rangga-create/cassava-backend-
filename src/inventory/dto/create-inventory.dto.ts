import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateInventoryDto {
  @ApiProperty({ description: "Product ID" })
  @IsString()
  productId: string;

  @ApiProperty({ description: "Batch ID" })
  @IsString()
  batchId: string;

  @ApiProperty({ description: "Warehouse ID" })
  @IsString()
  warehouseId: string;

  @ApiProperty({ description: "Quantity", example: 500 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: "Reserved quantity" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reservedQuantity?: number;

  @ApiProperty({ description: "Unit", example: "MT" })
  @IsString()
  unit: string;

  @ApiProperty({ description: "Grade", example: "A" })
  @IsString()
  grade: string;

  @ApiPropertyOptional({ description: "Stock value" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockValue?: number;
}
