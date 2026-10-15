import { IsEmail, IsString, MinLength, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ description: "User email", example: "user@indocassava.com" })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Password",
    minLength: 8,
    example: "password123",
  })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  password: string;

  @ApiProperty({ description: "Full name", example: "John Doe" })
  @IsString()
  @MinLength(2, { message: "Name must be at least 2 characters" })
  name: string;

  @ApiPropertyOptional({ description: "Phone number" })
  @IsOptional()
  @IsString()
  phone?: string;
}
