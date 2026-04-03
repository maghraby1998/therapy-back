export class DoctorCertificateModel {
  id: string;

  title: string;

  issuer?: string | null;

  fileUrl: string;

  createdAt: Date;

  updatedAt: Date;
}
