import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { DayOfWeek } from '../enums/day-of-week.enum';
import { ScheduleStatus } from '../enums/schedule-status.enum';

export class ScheduleSlotInput {
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;
}

export class CreateScheduleInput {
  @IsDateString()
  startsAt: string;

  @IsEnum(ScheduleStatus)
  status: ScheduleStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotInput)
  slots?: ScheduleSlotInput[];
}
