import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddToCartDto {
  @ApiProperty({ description: "Product ID" })
  @IsString()
  productId: string;

  @ApiProperty({ description: "Quantity to add" })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: "Product name (for display)" })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ description: "Product image URL" })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "Price per unit" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ description: "New quantity" })
  @IsNumber()
  @Min(1)
  quantity: number;
}
