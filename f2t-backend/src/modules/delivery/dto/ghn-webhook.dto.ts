import { IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GhnWebhookDto {
  @ApiProperty({ description: "GHN order code", example: "GHN-ABC123" })
  @IsString()
  OrderCode!: string;

  @ApiProperty({ description: "New GHN status", example: "delivered" })
  @IsString()
  Status!: string;

  @ApiProperty({ description: "Human-readable status description", required: false })
  @IsOptional()
  @IsString()
  Description?: string;

  @ApiProperty({ description: "ISO timestamp of the status change", required: false })
  @IsOptional()
  @IsString()
  Time?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ShipperName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  Reason?: string;
}
