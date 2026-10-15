import { IsEmail, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ description: "User email", example: "user@indocassava.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Password", example: "password123" })
  @IsString()
  password: string;
}
