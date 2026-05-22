export type DoctorVerificationDocumentTypeSeed = {
  name: string;
  description?: string;
  isRequired: boolean;
  isActive?: boolean;
};

export const doctorVerificationDocumentTypeSeeds: DoctorVerificationDocumentTypeSeed[] =
  [
    {
      name: 'Medical License',
      description: 'Government-issued license proving the doctor can practice.',
      isRequired: true,
    },
    {
      name: 'National ID or Passport',
      description: 'Identity document matching the doctor registration details.',
      isRequired: true,
    },
    {
      name: 'Degree Certificate',
      description: 'University graduation certificate or equivalent medical degree proof.',
      isRequired: true,
    },
    {
      name: 'Board Certification',
      description: 'Specialty certification document, if the doctor has one.',
      isRequired: false,
    },
    {
      name: 'Clinic Affiliation Letter',
      description: 'Optional proof of current clinic or hospital affiliation.',
      isRequired: false,
    },
  ];
