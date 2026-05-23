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
import { TrackSource } from 'livekit-server-sdk';
import { UserWithProfiles } from '../users/users.service';
import { PrismaService } from '../prisma.service';
import { DayOfWeek } from './enums/day-of-week.enum';
import { LiveKitService } from './livekit/livekit.service';
import { BookSessionInput } from './dto/book-session.input';
import { SetAvailabilityInput } from './dto/set-availability.input';
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

    const sessionDurationMinutes =
      doctor.doctorProfile.sessionDurationMinutes || 60;
    const actualDurationMinutes =
      (endsAt.getTime() - startsAt.getTime()) / 60_000;

    if (actualDurationMinutes !== sessionDurationMinutes) {
      throw new BadRequestException(
        `Session must be exactly ${sessionDurationMinutes} minutes long`,
      );
    }

    await this.validateSlotInAvailability(input.doctorId, startsAt, endsAt);

    await this.ensureNoConflicts({
      patientId: user.id,
      doctorId: doctor.id,
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

    const isAnonymousPatient = user.patientProfile?.isAnonymous === true;

    const token = await this.liveKit.generateToken({
      identity: user.id,
      roomName: session.roomName,
      canPublish: true,
      allowedSources: isAnonymousPatient ? [TrackSource.MICROPHONE] : undefined,
    });

    return { roomName: session.roomName, token, sessionId: session.id };
  }

  async setAvailability(
    user: UserWithProfiles,
    input: SetAvailabilityInput,
  ) {
    if (user.role !== UserRole.DOCTOR || !user.doctorProfile) {
      throw new ForbiddenException('Only doctors can set availability');
    }

    const doctorProfileId = user.doctorProfile.id;

    await this.prisma.doctorAvailability.deleteMany({
      where: { doctorId: doctorProfileId },
    });

    if (input.slots.length === 0) {
      return [];
    }

    const records = input.slots.map((slot) => ({
      doctorId: doctorProfileId,
      dayOfWeek: slot.dayOfWeek as unknown as number,
      startTime: slot.startTime,
      endTime: slot.endTime,
      startDate: new Date(slot.startDate),
      endDate: new Date(slot.endDate),
    }));

    await this.prisma.doctorAvailability.createMany({ data: records });

    const saved = await this.prisma.doctorAvailability.findMany({
      where: { doctorId: doctorProfileId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return saved.map(mapAvailability);
  }

  async updateSessionDuration(user: UserWithProfiles, minutes: number) {
    if (user.role !== UserRole.DOCTOR || !user.doctorProfile) {
      throw new ForbiddenException('Only doctors can update session duration');
    }

    return this.prisma.doctorProfile.update({
      where: { id: user.doctorProfile.id },
      data: { sessionDurationMinutes: minutes },
      include: {
        certificates: {
          include: { documentType: true },
        },
      },
    });
  }

  async findFreeSlots(doctorUserId: string, dateStr: string) {
    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    const dayOfWeek = date.getDay();

    const doctorUser = await this.prisma.user.findUnique({
      where: { id: doctorUserId },
      include: {
        doctorProfile: {
          include: { availability: true },
        },
      },
    });

    if (!doctorUser?.doctorProfile) {
      throw new NotFoundException('Doctor not found');
    }

    const { doctorProfile } = doctorUser;
    const sessionDuration = doctorProfile.sessionDurationMinutes || 60;

    const coverageRules = doctorProfile.availability.filter((a) => {
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      end.setHours(23, 59, 59, 999);
      return a.dayOfWeek === dayOfWeek && start <= date && end >= date;
    });

    if (coverageRules.length === 0) {
      return [];
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const bookedSessions = await this.prisma.session.findMany({
      where: {
        doctorId: doctorUserId,
        status: { in: [SessionStatus.PENDING, SessionStatus.CONFIRMED] },
        startsAt: { gte: dayStart, lt: dayEnd },
      },
      select: { startsAt: true, endsAt: true },
    });

    const ranges = coverageRules.map((rule) => {
      const [startH, startM] = rule.startTime.split(':').map(Number);
      const [endH, endM] = rule.endTime.split(':').map(Number);
      const start = new Date(date);
      start.setHours(startH, startM, 0, 0);
      const end = new Date(date);
      end.setHours(endH, endM, 0, 0);
      return { start, end };
    });

    const slots: { startTime: Date; endTime: Date }[] = [];
    const durationMs = sessionDuration * 60 * 1000;

    for (const range of ranges) {
      const cursor = new Date(range.start);

      while (cursor.getTime() + durationMs <= range.end.getTime()) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + durationMs);

        const hasOverlap = bookedSessions.some(
          (s) => slotStart < s.endsAt && slotEnd > s.startsAt,
        );

        if (!hasOverlap) {
          slots.push({ startTime: slotStart, endTime: slotEnd });
        }

        cursor.setTime(cursor.getTime() + durationMs);
      }
    }

    return slots;
  }

  async getDoctorAvailability(doctorProfileId: string) {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.prisma.doctorAvailability.findMany({
      where: { doctorId: doctorProfileId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  private async validateSlotInAvailability(
    doctorProfileId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    const dayOfWeek = startsAt.getDay();

    const rules = await this.prisma.doctorAvailability.findMany({
      where: {
        doctorId: doctorProfileId,
        dayOfWeek,
        startDate: { lte: startsAt },
        endDate: { gte: startsAt },
      },
    });

    if (rules.length === 0) {
      throw new BadRequestException(
        'The doctor is not available at this date and time',
      );
    }

    const startMinutes = startsAt.getHours() * 60 + startsAt.getMinutes();
    const endMinutes = endsAt.getHours() * 60 + endsAt.getMinutes();

    const isCovered = rules.some((r) => {
      const [sh, sm] = r.startTime.split(':').map(Number);
      const [eh, em] = r.endTime.split(':').map(Number);
      return startMinutes >= sh * 60 + sm && endMinutes <= eh * 60 + em;
    });

    if (!isCovered) {
      throw new BadRequestException(
        'The requested time does not fall within the doctor\'s availability',
      );
    }
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

function mapAvailability<T extends Record<string, unknown>>(
  record: T & { dayOfWeek: number },
): T & { dayOfWeek: DayOfWeek } {
  return {
    ...record,
    dayOfWeek: DayOfWeek[record.dayOfWeek] as unknown as DayOfWeek,
  };
}
