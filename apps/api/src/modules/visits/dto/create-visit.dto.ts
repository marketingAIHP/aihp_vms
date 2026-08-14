import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateVisitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  visitorName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  company!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  purpose!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  building!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  floor!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  room!: string;

  @IsOptional()
  @IsUUID("4")
  siteManagerId?: string;
}
