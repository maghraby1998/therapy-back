import { SessionStatus } from '../../../generated/prisma/enums';
import { UserModel } from '../../users/models/user.model';

export class SessionModel {
  id: string;

  startsAt: Date;

  endsAt: Date;

  notes?: string | null;

  status: SessionStatus;

  roomName?: string | null;

  createdAt: Date;

  updatedAt: Date;

  patient: UserModel;

  doctor: UserModel;
}

export { DoctorScheduleModel } from './doctor-schedule.model';
export { ScheduleSlotModel } from './schedule-slot.model';
export { TimeSlotModel } from './time-slot.model';
