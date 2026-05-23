import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserWithProfiles, UsersService } from '../users/users.service';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { UserRole } from '../../generated/prisma/enums';

type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  email: string;
  phone: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput) {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();
    const nickname = input.nickname?.trim();
    const isAnonymous = input.isAnonymous;

    if (input.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin accounts cannot self-register');
    }

    const [existingEmailUser, existingPhoneUser] = await Promise.all([
      this.usersService.findByEmail(email),
      this.usersService.findByPhone(phone),
    ]);

    if (existingEmailUser) {
      throw new BadRequestException('Email is already registered');
    }

    if (existingPhoneUser) {
      throw new BadRequestException('Phone is already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.usersService.createUser({
      name,
      email,
      phone,
      passwordHash,
      role: input.role,
      nickname,
      isAnonymous,
    });

    return this.buildAuthPayload(user);
  }

  async login(input: LoginInput) {
    const user = await this.usersService.findByEmailOrPhone(input.emailOrPhone);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const fullUser = await this.usersService.findById(user.id);

    if (!fullUser) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.buildAuthPayload(fullUser);
  }

  async validateUserById(userId: string) {
    return this.usersService.findById(userId);
  }

  private async buildAuthPayload(user: UserWithProfiles) {
    return {
      accessToken: await this.jwtService.signAsync(
        this.buildAccessTokenPayload(user),
      ),
      tokenType: 'Bearer',
      user,
    };
  }

  private buildAccessTokenPayload(user: UserWithProfiles): AccessTokenPayload {
    return {
      sub: user.id,
      role: user.role,
      email: user.email,
      phone: user.phone,
    };
  }
}
