import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UserRole } from '../../generated/prisma/enums';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdatePatientProfileInput } from '../auth/dto/update-patient-profile.input';
import { PatientProfileModel } from '../users/models/patient-profile.model';
import { UsersService } from './users.service';
import type { UserWithProfiles } from './users.service';

@Resolver('PatientProfile')
export class PatientResolver {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation('updatePatientProfile')
  async updatePatientProfile(
    @CurrentUser() user: UserWithProfiles,
    @Args('input') input: UpdatePatientProfileInput,
  ): Promise<PatientProfileModel> {
    if (user.role !== UserRole.PATIENT) {
      throw new ForbiddenException('Only patients can update their profile');
    }

    const updated = await this.usersService.updatePatientProfile(user.id, {
      fullName: input.fullName,
      nickname: input.nickname,
      isAnonymous: input.isAnonymous,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      gender: input.gender,
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone,
    });

    return updated.patientProfile!;
  }
}
