import { DoctorVerificationStatus } from '../../common/enums/doctor-verification-status.enum';
import { DoctorCertificateModel } from './doctor-certificate.model';

export class DoctorProfileModel {
  id: string;

  fullName?: string | null;

  specialty?: string | null;

  bio?: string | null;

  yearsOfExperience?: number | null;

  licenseNumber?: string | null;

  verificationStatus: DoctorVerificationStatus;

  hasSubmittedRequiredDocuments?: boolean;

  visibleInSearch?: boolean;

  certificates: DoctorCertificateModel[];

  createdAt: Date;

  updatedAt: Date;
}
