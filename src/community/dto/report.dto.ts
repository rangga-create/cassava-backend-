import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum ReportTargetType {
  MESSAGE = "MESSAGE",
  MEMBER = "MEMBER",
}

export enum ReportReason {
  SPAM = "SPAM",
  HARASSMENT = "HARASSMENT",
  FRAUD = "FRAUD",
  THREAT = "THREAT",
  ILLEGAL_CONTENT = "ILLEGAL_CONTENT",
  OFF_TOPIC = "OFF_TOPIC",
  SENSITIVE_DATA_LEAK = "SENSITIVE_DATA_LEAK",
  IMPERSONATION = "IMPERSONATION",
  PRICE_COLLUSION = "PRICE_COLLUSION",
  OTHER = "OTHER",
}

export class CreateReportDto {
  @ApiProperty({ enum: ReportTargetType, example: ReportTargetType.MESSAGE })
  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  @ApiProperty({ example: "msg-001" })
  @IsString()
  targetId: string;

  @ApiProperty({ enum: ReportReason, example: ReportReason.SPAM })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({ example: "Pengguna ini mengirim pesan spam berulang" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ReviewReportDto {
  @ApiPropertyOptional({ example: "Peringatan diberikan ke pengguna" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolution?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  hideContent?: boolean;
}