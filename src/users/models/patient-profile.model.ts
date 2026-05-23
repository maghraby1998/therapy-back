export class PatientProfileModel {
  id: string;

  fullName?: string | null;

  nickname?: string | null;

  isAnonymous: boolean;

  dateOfBirth?: Date | null;

  gender?: string | null;

  emergencyContactName?: string | null;

  emergencyContactPhone?: string | null;

  createdAt: Date;

  updatedAt: Date;
}
