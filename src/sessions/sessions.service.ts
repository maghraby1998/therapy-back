import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DoctorVerificationStatus,
  Prisma,
  SessionStatus,
  UserRole,
} from '../../generated/prisma/client';
import { UserWithProfiles } from '../users/users.service';
import { PrismaService } from '../prisma.service';
import { LiveKitService } from './livekit/livekit.service';
import { BookSessionInput } from './dto/book-session.input';
import { UpdateSessionStatusInput } from './dto/update-session-status.input';

const sessionInclude = {
  patient: {
    include: {
      patientProfile: true,
      doctorProfile: {
        include: {
          certificates: {
            include: {
              documentType: true,
            },
          },
        },
      },
    },
  },
  doctor: {
    include: {
      patientProfile: true,
      doctorProfile: {
        include: {
          certificates: {
            include: {
              documentType: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.SessionInclude;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly liveKit: LiveKitService,
  ) {}

  async bookSession(user: UserWithProfiles, input: BookSessionInput) {
    if (user.role !== UserRole.PATIENT) {
      throw new ForbiddenException('Only patients can book sessions');
    }

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid session date');
    }

    if (endsAt <= startsAt) {
      throw new BadRequestException(
        'Session end time must be after start time',
      );
    }

    if (input.doctorId === user.id) {
      throw new BadRequestException(
        'Patients cannot book sessions with themselves',
      );
    }

    const doctor = await this.prisma.user.findFirst({
      where: { doctorProfile: { id: input.doctorId } },
      include: {
        doctorProfile: {
          include: {
            certificates: {
              include: {
                documentType: true,
              },
            },
          },
        },
      },
    });

    if (!doctor || doctor.role !== UserRole.DOCTOR || !doctor.doctorProfile) {
      throw new NotFoundException('Doctor not found');
    }

    const requiredDocumentTypes =
      await this.prisma.doctorVerificationDocumentType.findMany({
        where: {
          isActive: true,
          isRequired: true,
        },
        select: {
          id: true,
        },
      });

    const submittedDocumentTypeIds = new Set(
      doctor.doctorProfile.certificates
        .map((certificate) => certificate.documentTypeId)
        .filter((documentTypeId): documentTypeId is string => Boolean(documentTypeId)),
    );

    const canBeBooked =
      doctor.doctorProfile.verificationStatus ===
        DoctorVerificationStatus.APPROVED &&
      requiredDocumentTypes.every(({ id }) => submittedDocumentTypeIds.has(id));

    if (!canBeBooked) {
      throw new NotFoundException('Doctor not found');
    }

    await this.ensureNoConflicts({
      patientId: user.id,
      doctorId: input.doctorId,
      startsAt,
      endsAt,
    });

    return this.prisma.session.create({
      data: {
        patientId: user.id,
        doctorId: doctor.id,
        startsAt,
        endsAt,
        notes: input.notes || null,
      },
      include: sessionInclude,
    });
  }

  async updateSessionStatus(
    user: UserWithProfiles,
    input: UpdateSessionStatusInput,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: input.sessionId },
      include: sessionInclude,
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const isPatient = session.patientId === user.id;
    const isDoctor = session.doctorId === user.id;

    if (!isPatient && !isDoctor) {
      throw new ForbiddenException(
        'You are not allowed to update this session',
      );
    }

    if (
      session.status === SessionStatus.CANCELLED ||
      session.status === SessionStatus.COMPLETED
    ) {
      throw new BadRequestException('This session can no longer be updated');
    }

    if (isPatient && input.status !== SessionStatus.CANCELLED) {
      throw new ForbiddenException(
        'Patients can only cancel their own sessions',
      );
    }

    if (isDoctor && input.status === SessionStatus.PENDING) {
      throw new BadRequestException(
        'Doctors cannot move sessions back to pending',
      );
    }

    return this.prisma.session.update({
      where: { id: input.sessionId },
      data: {
        status: input.status,
      },
      include: sessionInclude,
    });
  }

  async findMySessions(user: UserWithProfiles) {
    return this.prisma.session.findMany({
      where: {
        OR: [{ patientId: user.id }, { doctorId: user.id }],
      },
      include: sessionInclude,
      orderBy: {
        startsAt: 'asc',
      },
    });
  }

  async startVideoCall(user: UserWithProfiles, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.doctorId !== user.id) {
      throw new ForbiddenException(
        'Only the assigned doctor can start a video call',
      );
    }

    if (session.status !== SessionStatus.CONFIRMED) {
      throw new BadRequestException(
        'Video call can only be started for confirmed sessions',
      );
    }

    if (session.roomName) {
      const token = await this.liveKit.generateToken({
        identity: user.id,
        roomName: session.roomName,
        canPublish: true,
      });

      return { roomName: session.roomName, token, sessionId: session.id };
    }

    const roomName = `session-${session.id}`;

    await this.liveKit.createRoom(roomName);

    await this.prisma.session.update({
      where: { id: session.id },
      data: { roomName },
    });

    const token = await this.liveKit.generateToken({
      identity: user.id,
      roomName,
      canPublish: true,
    });

    return { roomName, token, sessionId: session.id };
  }

  async joinVideoCall(user: UserWithProfiles, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.patientId !== user.id && session.doctorId !== user.id) {
      throw new ForbiddenException('You are not a participant of this session');
    }

    if (session.status !== SessionStatus.CONFIRMED) {
      throw new BadRequestException(
        'This session is not ready for a video call',
      );
    }

    if (!session.roomName) {
      throw new BadRequestException(
        'The doctor has not started the video call yet',
      );
    }

    const token = await this.liveKit.generateToken({
      identity: user.id,
      roomName: session.roomName,
      canPublish: true,
    });

    return { roomName: session.roomName, token, sessionId: session.id };
  }

  private async ensureNoConflicts(params: {
    patientId: string;
    doctorId: string;
    startsAt: Date;
    endsAt: Date;
  }) {
    const { patientId, doctorId, startsAt, endsAt } = params;
    const overlappingStatuses = [
      SessionStatus.PENDING,
      SessionStatus.CONFIRMED,
    ];

    const conflictingSession = await this.prisma.session.findFirst({
      where: {
        status: {
          in: overlappingStatuses,
        },
        startsAt: {
          lt: endsAt,
        },
        endsAt: {
          gt: startsAt,
        },
        OR: [{ patientId }, { doctorId }],
      },
    });

    if (conflictingSession) {
      throw new BadRequestException(
        'The selected time overlaps with an existing session',
      );
    }
  }
}
