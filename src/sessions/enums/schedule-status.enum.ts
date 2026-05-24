import { ScheduleStatus as PrismaScheduleStatus } from '../../../generated/prisma/enums';

export const ScheduleStatus = PrismaScheduleStatus;
export type ScheduleStatus =
  (typeof ScheduleStatus)[keyof typeof ScheduleStatus];
