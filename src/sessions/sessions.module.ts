import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { liveKitConfig, LiveKitService } from './livekit';
import { SessionsResolver } from './sessions.resolver';
import { SessionsService } from './sessions.service';

@Module({
  imports: [ConfigModule.forFeature(liveKitConfig)],
  providers: [SessionsResolver, SessionsService, PrismaService, LiveKitService],
})
export class SessionsModule {}
