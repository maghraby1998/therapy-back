import { SessionStatus } from '../../../generated/prisma/enums';
import { UserModel } from '../../users/models/user.model';

export class SessionModel {
  id: string;

  startsAt: Date;

  endsAt: Date;

  notes?: string | null;

  status: SessionStatus;

  createdAt: Date;

  updatedAt: Date;

  patient: UserModel;

  doctor: UserModel;
}
