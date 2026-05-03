import { Transform } from 'class-transformer';
import { IsEnum, IsUUID } from 'class-validator';
import { SessionStatus } from '../../../generated/prisma/enums';

export class UpdateSessionStatusInput {
  @IsUUID()
  @Transform(({ value }) => value?.trim())
  sessionId: string;

  @IsEnum(SessionStatus)
  status: SessionStatus;
}
