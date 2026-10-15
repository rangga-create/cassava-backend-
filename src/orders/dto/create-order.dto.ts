import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OrderItemDto {
  @ApiProperty({ description: "Product ID" })
  @IsString()
  productId: string;

  @ApiProperty({ description: "Product name" })
  @IsString()
  productName: string;

  @ApiProperty({ description: "Quantity ordered" })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: "Price per unit" })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: "Unit of measurement" })
  @IsOptional()
  @IsString()
  unit?: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: "Customer ID" })
  @IsString()
  customerId: string;

  @ApiProperty({ description: "Customer name" })
  @IsString()
  customerName: string;

  @ApiProperty({ type: [OrderItemDto], description: "Order items" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ description: "Shipping address" })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({ description: "Billing address" })
  @IsOptional()
  @IsString()
  billingAddress?: string;

  @ApiPropertyOptional({ description: "Contact phone" })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: "Contact email" })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({ description: "Order notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Payment method" })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: "Shipping method" })
  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @ApiPropertyOptional({ description: "Discount amount" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ description: "Assigned sales person ID" })
  @IsOptional()
  @IsString()
  assignedSalesId?: string;
}
