import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DoctorVerificationStatus,
  Prisma,
  UserRole,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { UserWithProfiles } from '../users/users.service';
import { UpsertDoctorVerificationDocumentTypeInput } from './dto/upsert-doctor-verification-document-type.input';
import { SubmitDoctorVerificationDocumentInput } from './dto/submit-doctor-verification-document.input';
import { ReviewDoctorVerificationInput } from './dto/review-doctor-verification.input';

const doctorProfileInclude = {
  certificates: {
    include: {
      documentType: true,
    },
  },
} satisfies Prisma.DoctorProfileInclude;

type DoctorProfileWithCertificates = Prisma.DoctorProfileGetPayload<{
  include: typeof doctorProfileInclude;
}>;

type DoctorProfileVisibilityInput = {
  id: string;
  verificationStatus: DoctorVerificationStatus;
  certificates: Array<{
    documentTypeId?: string | null;
  }>;
};

@Injectable()
export class DoctorService {
  constructor(private prisma: PrismaService) {}

  async getDoctors() {
    const requiredDocumentTypeIds =
      await this.getRequiredActiveDocumentTypeIds();
    const doctors = await this.prisma.doctorProfile.findMany({
      where: {
        verificationStatus: DoctorVerificationStatus.APPROVED,
      },
      include: doctorProfileInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return doctors.filter((doctor) =>
      this.hasSubmittedRequiredDocumentsFromIds(doctor, requiredDocumentTypeIds),
    );
  }

  async listVerificationDocumentTypes(
    user: UserWithProfiles | undefined,
    includeInactive = false,
  ) {
    if (includeInactive) {
      this.ensureAdmin(user);
    }

    return this.prisma.doctorVerificationDocumentType.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isRequired: 'desc' }, { name: 'asc' }],
    });
  }

  async getMySubmittedCertificates(user: UserWithProfiles | undefined) {
    const doctorProfile = this.ensureDoctor(user);

    return this.prisma.doctorCertificate.findMany({
      where: {
        doctorProfileId: doctorProfile.id,
      },
      include: {
        documentType: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async upsertVerificationDocumentType(
    user: UserWithProfiles | undefined,
    input: UpsertDoctorVerificationDocumentTypeInput,
  ) {
    this.ensureAdmin(user);

    const data = {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      isRequired: input.isRequired,
      isActive: input.isActive,
    };

    if (input.id) {
      const existingType =
        await this.prisma.doctorVerificationDocumentType.findUnique({
          where: { id: input.id },
        });

      if (!existingType) {
        throw new NotFoundException('Verification document type not found');
      }

      return this.prisma.doctorVerificationDocumentType.update({
        where: { id: input.id },
        data,
      });
    }

    return this.prisma.doctorVerificationDocumentType.create({
      data,
    });
  }

  async submitVerificationDocument(
    user: UserWithProfiles | undefined,
    input: SubmitDoctorVerificationDocumentInput,
  ) {
    const doctorProfile = this.ensureDoctor(user);
    const documentType =
      await this.prisma.doctorVerificationDocumentType.findFirst({
        where: {
          id: input.documentTypeId,
          isActive: true,
        },
      });

    if (!documentType) {
      throw new NotFoundException('Verification document type not found');
    }

    const certificate = await this.prisma.doctorCertificate.upsert({
      where: {
        doctorProfileId_documentTypeId: {
          doctorProfileId: doctorProfile.id,
          documentTypeId: documentType.id,
        },
      },
      create: {
        doctorProfileId: doctorProfile.id,
        documentTypeId: documentType.id,
        title: documentType.name,
        issuer: input.issuer?.trim() || null,
        fileUrl: input.fileUrl.trim(),
        notes: input.notes?.trim() || null,
      },
      update: {
        title: documentType.name,
        issuer: input.issuer?.trim() || null,
        fileUrl: input.fileUrl.trim(),
        notes: input.notes?.trim() || null,
      },
      include: {
        documentType: true,
      },
    });

    const hasSubmittedRequiredDocuments =
      await this.hasSubmittedRequiredDocumentsByProfileId(doctorProfile.id);

    if (
      hasSubmittedRequiredDocuments &&
      (doctorProfile.verificationStatus === DoctorVerificationStatus.PENDING ||
        doctorProfile.verificationStatus === DoctorVerificationStatus.REJECTED)
    ) {
      await this.prisma.doctorProfile.update({
        where: { id: doctorProfile.id },
        data: {
          verificationStatus: DoctorVerificationStatus.UNDER_REVIEW,
        },
      });
    }

    return certificate;
  }

  async reviewDoctorVerification(
    user: UserWithProfiles | undefined,
    input: ReviewDoctorVerificationInput,
  ) {
    this.ensureAdmin(user);

    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { id: input.doctorProfileId },
      include: doctorProfileInclude,
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    if (
      input.status === DoctorVerificationStatus.APPROVED &&
      !(await this.hasSubmittedRequiredDocumentsByProfileId(doctorProfile.id))
    ) {
      throw new BadRequestException(
        'Doctor has not submitted every required verification document',
      );
    }

    return this.prisma.doctorProfile.update({
      where: { id: input.doctorProfileId },
      data: {
        verificationStatus: input.status,
      },
      include: doctorProfileInclude,
    });
  }

  async hasSubmittedRequiredDocuments(
    profile: Pick<DoctorProfileVisibilityInput, 'id' | 'certificates'>,
  ) {
    const requiredDocumentTypeIds =
      await this.getRequiredActiveDocumentTypeIds();

    return this.hasSubmittedRequiredDocumentsFromIds(
      profile,
      requiredDocumentTypeIds,
    );
  }

  async isVisibleInSearch(
    profile: DoctorProfileVisibilityInput,
  ) {
    if (profile.verificationStatus !== DoctorVerificationStatus.APPROVED) {
      return false;
    }

    return this.hasSubmittedRequiredDocuments(profile);
  }

  private ensureAdmin(user: UserWithProfiles | undefined) {
    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only admins can manage doctor verification requirements',
      );
    }
  }

  private ensureDoctor(user: UserWithProfiles | undefined) {
    if (!user || user.role !== UserRole.DOCTOR || !user.doctorProfile) {
      throw new ForbiddenException(
        'Only doctors can submit verification documents',
      );
    }

    return user.doctorProfile;
  }

  private async getRequiredActiveDocumentTypeIds() {
    const documentTypes = await this.prisma.doctorVerificationDocumentType.findMany(
      {
        where: {
          isActive: true,
          isRequired: true,
        },
        select: {
          id: true,
        },
      },
    );

    return documentTypes.map((documentType) => documentType.id);
  }

  private async hasSubmittedRequiredDocumentsByProfileId(doctorProfileId: string) {
    const [requiredDocumentTypeIds, doctorProfile] = await Promise.all([
      this.getRequiredActiveDocumentTypeIds(),
      this.prisma.doctorProfile.findUnique({
        where: { id: doctorProfileId },
        include: doctorProfileInclude,
      }),
    ]);

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.hasSubmittedRequiredDocumentsFromIds(
      doctorProfile,
      requiredDocumentTypeIds,
    );
  }

  private hasSubmittedRequiredDocumentsFromIds(
    profile: Pick<DoctorProfileVisibilityInput, 'certificates'>,
    requiredDocumentTypeIds: string[],
  ) {
    if (requiredDocumentTypeIds.length === 0) {
      return true;
    }

    const submittedDocumentTypeIds = new Set(
      profile.certificates
        .map((certificate) => certificate.documentTypeId)
        .filter((documentTypeId): documentTypeId is string => Boolean(documentTypeId)),
    );

    return requiredDocumentTypeIds.every((id) => submittedDocumentTypeIds.has(id));
  }
}
