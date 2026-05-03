import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SessionsResolver } from './sessions.resolver';
import { SessionsService } from './sessions.service';

@Module({
  providers: [SessionsResolver, SessionsService, PrismaService],
})
export class SessionsModule {}
