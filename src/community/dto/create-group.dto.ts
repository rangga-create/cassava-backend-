import { IsString, IsOptional, IsEnum, MinLength, MaxLength, IsUrl } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum GroupVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  INVITE_ONLY = "INVITE_ONLY",
}

export enum GroupTopic {
  CULTIVATION = "CULTIVATION",
  QUALITY = "QUALITY",
  PROCESSING = "PROCESSING",
  TECHNOLOGY = "TECHNOLOGY",
  MARKET = "MARKET",
  GENERAL = "GENERAL",
}

export class CreateGroupDto {
  @ApiProperty({ example: "Budidaya Singkong Berkualitas" })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: "Grup diskusi tentang teknik budidaya singkong yang baik dan benar" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: GroupTopic, example: GroupTopic.CULTIVATION })
  @IsEnum(GroupTopic)
  topic: GroupTopic;

  @ApiProperty({ enum: GroupVisibility, example: GroupVisibility.PUBLIC })
  @IsEnum(GroupVisibility)
  visibility: GroupVisibility;

  @ApiPropertyOptional({ example: "Tetap santun, tidak spam, bahas sesuai topik" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rules?: string;

  @ApiPropertyOptional({ example: "https://res.cloudinary.com/example/image/upload/group.jpg" })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ example: "cassava/community/group-photos/group" })
  @IsOptional()
  @IsString()
  imagePublicId?: string;
}