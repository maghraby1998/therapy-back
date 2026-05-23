import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { sanitizeUserForViewer } from '../users/user-sanitizer';
import type { UserWithProfiles } from '../users/users.service';
import { BookSessionInput } from './dto/book-session.input';
import { UpdateSessionStatusInput } from './dto/update-session-status.input';
import { SessionModel } from './models/session.model';
import { VideoCallRoomModel } from './models/video-call-room.model';
import { SessionsService } from './sessions.service';

@Resolver('Session')
export class SessionsResolver {
  constructor(private readonly sessionsService: SessionsService) {}

  @UseGuards(GqlAuthGuard)
  @Query('mySessions')
  async mySessions(@CurrentUser() user: UserWithProfiles): Promise<SessionModel[]> {
    const sessions = await this.sessionsService.findMySessions(user);

    return sessions.map((session) => ({
      ...session,
      patient: sanitizeUserForViewer(session.patient, user.id),
      doctor: sanitizeUserForViewer(session.doctor, user.id),
    }));
  }

  @UseGuards(GqlAuthGuard)
  @Mutation('bookSession')
  async bookSession(
    @CurrentUser() user: UserWithProfiles,
    @Args('input') input: BookSessionInput,
  ): Promise<SessionModel> {
    const session = await this.sessionsService.bookSession(user, input);

    return {
      ...session,
      patient: sanitizeUserForViewer(session.patient, user.id),
      doctor: sanitizeUserForViewer(session.doctor, user.id),
    };
  }

  @UseGuards(GqlAuthGuard)
  @Mutation('updateSessionStatus')
  async updateSessionStatus(
    @CurrentUser() user: UserWithProfiles,
    @Args('input') input: UpdateSessionStatusInput,
  ): Promise<SessionModel> {
    const session = await this.sessionsService.updateSessionStatus(user, input);

    return {
      ...session,
      patient: sanitizeUserForViewer(session.patient, user.id),
      doctor: sanitizeUserForViewer(session.doctor, user.id),
    };
  }

  @UseGuards(GqlAuthGuard)
  @Mutation('startVideoCall')
  startVideoCall(
    @CurrentUser() user: UserWithProfiles,
    @Args('sessionId') sessionId: string,
  ): Promise<VideoCallRoomModel> {
    return this.sessionsService.startVideoCall(user, sessionId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation('joinVideoCall')
  joinVideoCall(
    @CurrentUser() user: UserWithProfiles,
    @Args('sessionId') sessionId: string,
  ): Promise<VideoCallRoomModel> {
    return this.sessionsService.joinVideoCall(user, sessionId);
  }
}
