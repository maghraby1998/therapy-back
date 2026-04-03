import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserWithProfiles } from '../users/users.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserWithProfiles | undefined => {
    const gqlContext = GqlExecutionContext.create(context);
    return gqlContext.getContext().req.user;
  },
);
