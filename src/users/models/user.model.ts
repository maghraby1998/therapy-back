import { UserRole } from '../../../generated/prisma/enums';
import { DoctorProfileModel } from './doctor-profile.model';
import { PatientProfileModel } from './patient-profile.model';

export class UserModel {
  id: string;

  email: string;

  phone: string;

  role: UserRole;

  isActive: boolean;

  isEmailVerified: boolean;

  isPhoneVerified: boolean;

  profileCompletedAt?: Date | null;

  createdAt: Date;

  updatedAt: Date;

  patientProfile?: PatientProfileModel | null;

  doctorProfile?: DoctorProfileModel | null;
}
