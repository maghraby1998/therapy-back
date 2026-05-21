import { Module } from '@nestjs/common';
import { DoctorResolver } from './doctor.resolver';
import { DoctorService } from './doctor.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [DoctorResolver, DoctorService, PrismaService],
})
export class DoctorModule {}
