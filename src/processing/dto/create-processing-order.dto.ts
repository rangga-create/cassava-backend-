import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateProcessingOrderDto {
  @ApiProperty({ description: "Raw material (product) ID" })
  @IsString()
  rawMaterialId: string;

  @ApiProperty({ description: "Input quantity in MT", example: 100 })
  @IsNumber()
  @Min(0)
  inputQuantity: number;

  @ApiPropertyOptional({ description: "Output quantity in MT" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  outputQuantity?: number;

  @ApiPropertyOptional({ description: "Processing cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  processingCost?: number;

  @ApiPropertyOptional({ description: "Labor cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  labor?: number;

  @ApiPropertyOptional({ description: "Energy cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  energy?: number;

  @ApiPropertyOptional({ description: "Packaging cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  packaging?: number;
}
