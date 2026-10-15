import {
  IsString,
  IsEmail,
  IsArray,
  IsOptional,
  IsNumber,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCustomerDto {
  @ApiProperty({ description: "Company name", example: "Global Foods Inc." })
  @IsString()
  companyName: string;

  @ApiProperty({ description: "Contact name", example: "John Smith" })
  @IsString()
  contactName: string;

  @ApiProperty({ description: "Email", example: "john@globalfoods.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Phone", example: "+1234567890" })
  @IsString()
  phone: string;

  @ApiProperty({ description: "Country", example: "United States" })
  @IsString()
  country: string;

  @ApiPropertyOptional({ description: "Address" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: "Products interested in",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  products?: string[];

  @ApiPropertyOptional({ description: "Credit limit", example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ description: "Payment terms", example: "Net 30" })
  @IsOptional()
  @IsString()
  paymentTerms?: string;
}
