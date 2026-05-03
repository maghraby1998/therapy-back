import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SessionStatus, UserRole } from '../../generated/prisma/client';
import { UserWithProfiles } from '../users/users.service';
import { PrismaService } from '../prisma.service';
import { BookSessionInput } from './dto/book-session.input';
import { UpdateSessionStatusInput } from './dto/update-session-status.input';

const sessionInclude = {
  patient: {
    include: {
      patientProfile: true,
      doctorProfile: {
        include: {
          certificates: true,
        },
      },
    },
  },
  doctor: {
    include: {
      patientProfile: true,
      doctorProfile: {
        include: {
          certificates: true,
        },
      },
    },
  },
} satisfies Prisma.SessionInclude;

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

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
      throw new BadRequestException('Session end time must be after start time');
    }

    if (input.doctorId === user.id) {
      throw new BadRequestException('Patients cannot book sessions with themselves');
    }

    const doctor = await this.prisma.user.findUnique({
      where: { id: input.doctorId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor || doctor.role !== UserRole.DOCTOR || !doctor.doctorProfile) {
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
        doctorId: input.doctorId,
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
      throw new ForbiddenException('You are not allowed to update this session');
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
      throw new BadRequestException('Doctors cannot move sessions back to pending');
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

  private async ensureNoConflicts(params: {
    patientId: string;
    doctorId: string;
    startsAt: Date;
    endsAt: Date;
  }) {
    const { patientId, doctorId, startsAt, endsAt } = params;
    const overlappingStatuses = [SessionStatus.PENDING, SessionStatus.CONFIRMED];

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
