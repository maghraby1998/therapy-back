type SanitizableUser = {
  id: string;
  email: string;
  phone: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  patientProfile?: {
    isAnonymous: boolean;
    fullName?: string | null;
    nickname?: string | null;
    dateOfBirth?: Date | null;
    gender?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
  } | null;
};

export function sanitizeUserForViewer<T extends SanitizableUser>(
  user: T,
  viewerId: string,
): T {
  if (user.id === viewerId) {
    return user;
  }

  const isAnonymousPatient = user.patientProfile?.isAnonymous === true;

  if (!isAnonymousPatient) {
    return user;
  }

  const sanitized = {
    ...user,
    email: null,
    phone: null,
    isEmailVerified: false,
    isPhoneVerified: false,
    patientProfile: user.patientProfile
      ? {
          ...user.patientProfile,
          fullName: user.patientProfile.nickname || user.patientProfile.fullName,
          dateOfBirth: null,
          gender: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
        }
      : user.patientProfile,
  };

  return sanitized as unknown as T;
}
