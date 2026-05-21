import { Query, Resolver } from '@nestjs/graphql';
import { DoctorService } from './doctor.service';

@Resolver('DoctorProfile')
export class DoctorResolver {
  constructor(private doctorService: DoctorService) {}

  @Query()
  doctors() {
    return this.doctorService.getDoctors();
  }
}
