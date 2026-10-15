import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateShipmentDto {
  @ApiProperty({ description: "Container number", example: "MSKU1234567" })
  @IsString()
  container: string;

  @ApiProperty({ description: "Carrier name", example: "Maersk" })
  @IsString()
  carrier: string;

  @ApiProperty({ description: "Origin", example: "Surabaya, Indonesia" })
  @IsString()
  origin: string;

  @ApiProperty({ description: "Destination", example: "Shanghai, China" })
  @IsString()
  destination: string;

  @ApiPropertyOptional({ description: "Port", example: "Port of Surabaya" })
  @IsOptional()
  @IsString()
  port?: string;

  @ApiPropertyOptional({ description: "Estimated time of departure" })
  @IsOptional()
  @IsString()
  etd?: string;

  @ApiPropertyOptional({ description: "Estimated time of arrival" })
  @IsOptional()
  @IsString()
  eta?: string;

  @ApiProperty({ description: "Product ID" })
  @IsString()
  productId: string;

  @ApiProperty({ description: "Quantity in MT", example: 200 })
  @IsNumber()
  @Min(0)
  quantity: number;
}
