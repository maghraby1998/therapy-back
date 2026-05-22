import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { CurrentUser } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { DoctorService } from './doctor.service';
import { DoctorProfileModel } from '../users/models/doctor-profile.model';
import type { UserWithProfiles } from '../users/users.service';
import { UpsertDoctorVerificationDocumentTypeInput } from './dto/upsert-doctor-verification-document-type.input';
import { SubmitDoctorVerificationDocumentInput } from './dto/submit-doctor-verification-document.input';
import { ReviewDoctorVerificationInput } from './dto/review-doctor-verification.input';

@Resolver('DoctorProfile')
export class DoctorResolver {
  constructor(private doctorService: DoctorService) {}

  @Query()
  doctors() {
    return this.doctorService.getDoctors();
  }

  @UseGuards(GqlAuthGuard)
  @Query()
  verificationDocumentTypes(
    @CurrentUser() user: UserWithProfiles,
    @Args('includeInactive', { nullable: true }) includeInactive?: boolean,
  ) {
    return this.doctorService.listVerificationDocumentTypes(
      user,
      includeInactive,
    );
  }

  @UseGuards(GqlAuthGuard)
  @Query()
  mySubmittedCertificates(@CurrentUser() user: UserWithProfiles) {
    return this.doctorService.getMySubmittedCertificates(user);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation()
  upsertDoctorVerificationDocumentType(
    @CurrentUser() user: UserWithProfiles,
    @Args('input') input: UpsertDoctorVerificationDocumentTypeInput,
  ) {
    return this.doctorService.upsertVerificationDocumentType(user, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation()
  submitDoctorVerificationDocument(
    @CurrentUser() user: UserWithProfiles,
    @Args('input') input: SubmitDoctorVerificationDocumentInput,
  ) {
    return this.doctorService.submitVerificationDocument(user, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation()
  reviewDoctorVerification(
    @CurrentUser() user: UserWithProfiles,
    @Args('input') input: ReviewDoctorVerificationInput,
  ) {
    return this.doctorService.reviewDoctorVerification(user, input);
  }

  @ResolveField('hasSubmittedRequiredDocuments')
  hasSubmittedRequiredDocuments(@Parent() profile: DoctorProfileModel) {
    return this.doctorService.hasSubmittedRequiredDocuments(profile);
  }

  @ResolveField('visibleInSearch')
  visibleInSearch(@Parent() profile: DoctorProfileModel) {
    return this.doctorService.isVisibleInSearch(profile);
  }
}
