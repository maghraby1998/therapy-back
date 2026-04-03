export class PatientProfileModel {
  id: string;

  fullName?: string | null;

  dateOfBirth?: Date | null;

  gender?: string | null;

  emergencyContactName?: string | null;

  emergencyContactPhone?: string | null;

  createdAt: Date;

  updatedAt: Date;
}
