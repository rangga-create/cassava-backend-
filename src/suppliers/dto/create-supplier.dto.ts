import {
  IsString,
  IsEmail,
  IsArray,
  IsOptional,
  IsNumber,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateSupplierDto {
  @ApiProperty({ description: "Company name", example: "PT Supplier Jaya" })
  @IsString()
  companyName: string;

  @ApiProperty({ description: "Contact name", example: "Budi Santoso" })
  @IsString()
  contactName: string;

  @ApiProperty({ description: "Email", example: "budi@supplier.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Phone", example: "+628123456789" })
  @IsString()
  phone: string;

  @ApiProperty({ description: "Country", example: "Indonesia" })
  @IsString()
  country: string;

  @ApiPropertyOptional({ description: "Province" })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: "City" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: "Address" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: "Products supplied", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  products?: string[];

  @ApiPropertyOptional({ description: "Payment terms", example: "Net 30" })
  @IsOptional()
  @IsString()
  paymentTerms?: string;
}
