import { IsString, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendMessageDto {
  @ApiProperty({ example: "Halo semua, ada tips budidaya singkong?" })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}