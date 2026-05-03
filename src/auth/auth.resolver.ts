import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from './current-user.decorator';
import { AuthPayloadModel } from './models/auth-payload.model';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { GqlAuthGuard } from './gql-auth.guard';
import { UserModel } from '../users/models/user.model';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation('register')
  register(@Args('input') input: RegisterInput): Promise<AuthPayloadModel> {
    console.log('attempt register');

    return this.authService.register(input);
  }

  @Mutation('login')
  login(@Args('input') input: LoginInput): Promise<AuthPayloadModel> {
    console.log('logging in');

    return this.authService.login(input);
  }

  @UseGuards(GqlAuthGuard)
  @Query('me')
  me(@CurrentUser() user: UserModel): UserModel {
    return user;
  }
}
