import { IsString, IsNumber, IsEmail, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

class CustomerDetailsDto {
  @ApiProperty({ description: "Customer first name" })
  @IsString()
  firstName: string;

  @ApiProperty({ description: "Customer last name", required: false })
  @IsString()
  lastName?: string;

  @ApiProperty({ description: "Customer email" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Customer phone" })
  @IsString()
  phone: string;
}

export class CreatePaymentDto {
  @ApiProperty({ description: "Reference to sales order ID" })
  @IsString()
  salesOrderId: string;

  @ApiProperty({ description: "Payment amount" })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: "Currency code (IDR, USD)", example: "IDR" })
  @IsString()
  currency: string;

  @ApiProperty({ description: "Customer details for payment" })
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customerDetails: CustomerDetailsDto;
}
