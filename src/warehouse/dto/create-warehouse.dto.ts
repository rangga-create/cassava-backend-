import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateWarehouseDto {
  @ApiProperty({ description: "Warehouse name", example: "Surabaya Warehouse" })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Location",
    example: "Surabaya, East Java, Indonesia",
  })
  @IsString()
  location: string;

  @ApiProperty({ description: "Capacity in MT", example: 5000 })
  @IsNumber()
  @Min(0)
  capacity: number;

  @ApiPropertyOptional({ description: "Manager name" })
  @IsOptional()
  @IsString()
  manager?: string;
}
