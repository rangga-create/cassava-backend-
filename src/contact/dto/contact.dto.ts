import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export enum ContactSubject {
  PRODUCT_INQUIRY = "product_inquiry",
  PRICING = "pricing",
  BULK_ORDER = "bulk_order",
  PARTNERSHIP = "partnership",
  EXPORT_CONSULTATION = "export_consultation",
  OTHER = "other",
}

export class CreateContactDto {
  @ApiProperty({ description: "Full name", example: "John Doe" })
  @IsNotEmpty({ message: "Name is required" })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: "Email address", example: "john@example.com" })
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @ApiProperty({
    description: "Company name",
    example: "PT Maju Jaya",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;

  @ApiProperty({
    description: "Phone number",
    example: "+62 812 3456 7890",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    description: "Subject of inquiry",
    enum: ContactSubject,
    example: ContactSubject.PRODUCT_INQUIRY,
  })
  @IsNotEmpty({ message: "Subject is required" })
  @IsEnum(ContactSubject, { message: "Invalid subject" })
  subject: ContactSubject;

  @ApiProperty({
    description: "Message content",
    example: "I am interested in purchasing cassava flour in bulk...",
  })
  @IsNotEmpty({ message: "Message is required" })
  @IsString()
  @MaxLength(2000)
  message: string;
}
