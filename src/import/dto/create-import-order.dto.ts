import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateImportOrderDto {
  @ApiPropertyOptional({ description: "Supplier ID" })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: "Supplier name" })
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiProperty({ description: "Country of origin", example: "Thailand" })
  @IsString()
  country: string;

  @ApiProperty({ description: "Product ID" })
  @IsString()
  productId: string;

  @ApiProperty({ description: "Quantity in MT", example: 300 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: "Purchase value", example: 120000 })
  @IsNumber()
  @Min(0)
  purchaseValue: number;

  @ApiPropertyOptional({ description: "Currency", default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: "Freight cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freight?: number;

  @ApiPropertyOptional({ description: "Insurance cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  insurance?: number;

  @ApiPropertyOptional({ description: "Customs duty" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  customs?: number;

  @ApiPropertyOptional({ description: "Tax" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({ description: "Handling cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  handling?: number;

  @ApiPropertyOptional({ description: "Estimated time of arrival" })
  @IsOptional()
  @IsString()
  eta?: string;
}
