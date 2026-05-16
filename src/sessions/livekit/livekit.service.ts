import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { liveKitConfig } from './livekit.config';

@Injectable()
export class LiveKitService {
  private readonly roomService: RoomServiceClient;

  constructor(
    @Inject(liveKitConfig.KEY)
    private readonly config: ConfigType<typeof liveKitConfig>,
  ) {
    this.roomService = new RoomServiceClient(
      this.config.host,
      this.config.apiKey,
      this.config.apiSecret,
    );
  }

  async createRoom(roomName: string): Promise<void> {
    await this.roomService.createRoom({ name: roomName });
  }

  async generateToken(params: {
    identity: string;
    roomName: string;
    isHost: boolean;
  }): Promise<string> {
    const { identity, roomName, isHost } = params;

    const token = new AccessToken(this.config.apiKey, this.config.apiSecret, {
      identity,
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true,
    });

    return token.toJwt();
  }
}
