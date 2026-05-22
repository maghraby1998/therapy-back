import { DoctorVerificationDocumentTypeModel } from './doctor-verification-document-type.model';

export class DoctorCertificateModel {
  id: string;

  documentTypeId?: string | null;

  title: string;

  issuer?: string | null;

  fileUrl: string;

  notes?: string | null;

  documentType?: DoctorVerificationDocumentTypeModel | null;

  createdAt: Date;

  updatedAt: Date;
}
