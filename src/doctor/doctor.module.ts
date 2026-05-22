import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DoctorResolver } from './doctor.resolver';
import { DoctorService } from './doctor.service';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [AuthModule],
  providers: [DoctorResolver, DoctorService, PrismaService],
})
export class DoctorModule {}
