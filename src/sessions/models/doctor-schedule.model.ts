import { ScheduleStatus } from '../enums/schedule-status.enum';
import { ScheduleSlotModel } from './schedule-slot.model';

export class DoctorScheduleModel {
  id: string;

  startsAt: Date;

  status: ScheduleStatus;

  slots: ScheduleSlotModel[];
}
