import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DoctorService {
  constructor(private prisma: PrismaService) {}

  async getDoctors() {
    return this.prisma.doctorProfile.findMany();
  }
}
