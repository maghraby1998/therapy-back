import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import type { UserWithProfiles } from '../users/users.service';
import { BookSessionInput } from './dto/book-session.input';
import { UpdateSessionStatusInput } from './dto/update-session-status.input';
import { SessionModel } from './models/session.model';
import { SessionsService } from './sessions.service';

@Resolver('Session')
export class SessionsResolver {
  constructor(private readonly sessionsService: SessionsService) {}

  @UseGuards(GqlAuthGuard)
  @Query('mySessions')
  mySessions(@CurrentUser() user: UserWithProfiles): Promise<SessionModel[]> {
    return this.sessionsService.findMySessions(user);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation('bookSession')
  bookSession(
    @CurrentUser() user: UserWithProfiles,
    @Args('input') input: BookSessionInput,
  ): Promise<SessionModel> {
    return this.sessionsService.bookSession(user, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation('updateSessionStatus')
  updateSessionStatus(
    @CurrentUser() user: UserWithProfiles,
    @Args('input') input: UpdateSessionStatusInput,
  ): Promise<SessionModel> {
    return this.sessionsService.updateSessionStatus(user, input);
  }
}
