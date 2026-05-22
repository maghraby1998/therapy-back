import { Allow, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SubmitDoctorVerificationDocumentInput {
  @IsUUID()
  documentTypeId: string;

  @Allow()
  file: any;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuer?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  notes?: string;
}
