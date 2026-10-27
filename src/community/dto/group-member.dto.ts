import { IsString, IsEnum, IsOptional, IsEmail } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum GroupMemberRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: GroupMemberRole, example: GroupMemberRole.ADMIN })
  @IsEnum(GroupMemberRole)
  role: GroupMemberRole;
}

export class InviteMemberDto {
  @ApiPropertyOptional({ example: "user-002" })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: "user@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: GroupMemberRole, example: GroupMemberRole.MEMBER })
  @IsOptional()
  @IsEnum(GroupMemberRole)
  role?: GroupMemberRole = GroupMemberRole.MEMBER;
}