import { DayOfWeek } from '../enums/day-of-week.enum';

export class DoctorAvailabilityModel {
  id: string;

  dayOfWeek: DayOfWeek;

  startTime: string;

  endTime: string;

  startDate: Date;

  endDate: Date;
}
