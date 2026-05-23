import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { DayOfWeek } from '../enums/day-of-week.enum';

export class AvailabilityInput {
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

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class SetAvailabilityInput {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityInput)
  slots: AvailabilityInput[];
}
