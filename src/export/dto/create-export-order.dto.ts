import { IsString, IsNumber, IsOptional, IsArray, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateExportOrderDto {
  @ApiPropertyOptional({ description: "Sales Order ID" })
  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @ApiPropertyOptional({ description: "Buyer name" })
  @IsOptional()
  @IsString()
  buyerName?: string;

  @ApiProperty({ description: "Buyer (customer) ID" })
  @IsString()
  buyerId: string;

  @ApiProperty({ description: "Destination country", example: "China" })
  @IsString()
  country: string;

  @ApiProperty({ description: "Product ID" })
  @IsString()
  productId: string;

  @ApiProperty({ description: "Quantity in MT", example: 200 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: "Export value", example: 150000 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ description: "Currency", default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: "Incoterm", example: "FOB" })
  @IsOptional()
  @IsString()
  incoterm?: string;

  @ApiProperty({ description: "Port of loading", example: "Port of Surabaya" })
  @IsString()
  portOfLoading: string;

  @ApiProperty({
    description: "Port of destination",
    example: "Port of Shanghai",
  })
  @IsString()
  portOfDestination: string;

  @ApiPropertyOptional({ description: "Estimated time of departure" })
  @IsOptional()
  @IsString()
  etd?: string;

  @ApiPropertyOptional({ description: "Estimated time of arrival" })
  @IsOptional()
  @IsString()
  eta?: string;

  @ApiPropertyOptional({ description: "Shipment ID" })
  @IsOptional()
  @IsString()
  shipmentId?: string;

  @ApiPropertyOptional({ description: "Document IDs", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];
}
