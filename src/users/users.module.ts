import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { PatientResolver } from './patient.resolver';

@Module({
  providers: [UsersService, PrismaService, PatientResolver],
  exports: [UsersService],
})
export class UsersModule {}
