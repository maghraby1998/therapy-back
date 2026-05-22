import { IsEnum, IsUUID } from 'class-validator';
import { DoctorVerificationStatus } from '../../../generated/prisma/enums';

export class ReviewDoctorVerificationInput {
  @IsUUID()
  doctorProfileId: string;

  @IsEnum(DoctorVerificationStatus)
  status: DoctorVerificationStatus;
}
