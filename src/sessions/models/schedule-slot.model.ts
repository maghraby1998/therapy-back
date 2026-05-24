import { DayOfWeek } from '../enums/day-of-week.enum';

export class ScheduleSlotModel {
  id: string;

  dayOfWeek: DayOfWeek;

  startTime: string;

  endTime: string;
}
