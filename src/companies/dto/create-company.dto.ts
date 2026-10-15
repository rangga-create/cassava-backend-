import { IsString, IsOptional, IsEmail } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCompanyDto {
  @ApiProperty({ description: "Company name", example: "PT Indocassava Trading" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Company address" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: "Country" })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: "Phone number" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: "Email address" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: "Website" })
  @IsOptional()
  @IsString()
  website?: string;
}
