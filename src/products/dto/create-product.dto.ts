import { IsString, IsEnum, IsNumber, IsOptional, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProductCategory } from "../../common/guards/roles.guard";

export class CreateProductDto {
  @ApiProperty({ description: "Product SKU", example: "CSV-Fresh-001" })
  @IsString()
  sku: string;

  @ApiProperty({ description: "Product name", example: "Fresh Cassava" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Product description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Product category",
    enum: ProductCategory,
  })
  @IsEnum(ProductCategory)
  category: ProductCategory;

  @ApiProperty({ description: "Product grade", example: "A" })
  @IsString()
  grade: string;

  @ApiProperty({ description: "Unit of measurement", example: "MT" })
  @IsString()
  unit: string;

  @ApiPropertyOptional({ description: "Product origin" })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ description: "Purchase cost per unit" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseCost?: number;

  @ApiPropertyOptional({ description: "Processing cost per unit" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  processingCost?: number;

  @ApiProperty({ description: "Selling price per unit" })
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiPropertyOptional({ description: "Product image URL" })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "Product image Cloudinary public ID" })
  @IsOptional()
  @IsString()
  imagePublicId?: string;
}
