import {
  IsEmail,
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "../../common/guards/roles.guard";

export class CreateUserDto {
  @ApiProperty({ description: "User email" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Full name" })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ description: "Phone number" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: "User role",
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  @IsEnum(UserRole)
  role: UserRole = UserRole.VIEWER;
}
