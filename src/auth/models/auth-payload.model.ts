import { UserModel } from '../../users/models/user.model';

export class AuthPayloadModel {
  accessToken: string;

  tokenType: string;

  user: UserModel;
}
