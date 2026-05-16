import { registerAs } from '@nestjs/config';

export const liveKitConfig = registerAs('livekit', () => ({
  apiKey: process.env.LIVEKIT_API_KEY || '',
  apiSecret: process.env.LIVEKIT_API_SECRET || '',
  host: process.env.LIVEKIT_HOST || 'http://localhost:7880',
}));
