import { DoctorVerificationStatus as PrismaDoctorVerificationStatus } from '../../../generated/prisma/enums';

export const DoctorVerificationStatus = PrismaDoctorVerificationStatus;
export type DoctorVerificationStatus =
  (typeof DoctorVerificationStatus)[keyof typeof DoctorVerificationStatus];
