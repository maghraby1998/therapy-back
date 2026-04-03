import { Injectable } from '@nestjs/common';
import { Prisma, User, UserRole } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

const userWithProfilesInclude = {
  patientProfile: true,
  doctorProfile: {
    include: {
      certificates: true,
    },
  },
} satisfies Prisma.UserInclude;

export type UserWithProfiles = Prisma.UserGetPayload<{
  include: typeof userWithProfilesInclude;
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserWithProfiles | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: userWithProfilesInclude,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  async findByEmailOrPhone(emailOrPhone: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
      },
    });
  }

  async createUser(params: {
    email: string;
    phone: string;
    passwordHash: string;
    role: UserRole;
  }): Promise<UserWithProfiles> {
    const { email, phone, passwordHash, role } = params;

    return this.prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        role,
        patientProfile:
          role === UserRole.PATIENT
            ? {
                create: {},
              }
            : undefined,
        doctorProfile:
          role === UserRole.DOCTOR
            ? {
                create: {},
              }
            : undefined,
      },
      include: userWithProfilesInclude,
    });
  }
}
