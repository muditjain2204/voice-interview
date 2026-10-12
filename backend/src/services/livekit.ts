import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { config } from '../config';
import { logger } from '../utils/logger';

// LiveKit Room Service client for room management
const roomService = new RoomServiceClient(
  config.livekit.url,
  config.livekit.apiKey,
  config.livekit.apiSecret
);

export interface LiveKitTokenOptions {
  room: string;
  participantName: string;
  participantIdentity: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
  ttl?: number;
}

export async function generateLiveKitToken(
  options: LiveKitTokenOptions
): Promise<string> {
  try {
    const token = new AccessToken(
      config.livekit.apiKey,
      config.livekit.apiSecret,
      {
        identity: options.participantIdentity,
        name: options.participantName,
        ttl: options.ttl ? `${options.ttl}s` : '1h',
      }
    );

    token.addGrant({
      room: options.room,
      roomJoin: true,
      canPublish: options.canPublish ?? true,
      canSubscribe: options.canSubscribe ?? true,
      canPublishData: options.canPublishData ?? true,
    });

    return await token.toJwt();
  } catch (error) {
    logger.error('LiveKit token generation error:', error);
    throw new Error('Failed to generate LiveKit token');
  }
}

export async function createRoom(roomName: string): Promise<void> {
  try {
    await roomService.createRoom({ name: roomName });
    logger.info(`LiveKit room created: ${roomName}`);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      logger.info(`LiveKit room already exists: ${roomName}`);
      return;
    }
    logger.error('LiveKit room creation error:', error);
    throw new Error('Failed to create LiveKit room');
  }
}

export async function endRoom(roomName: string): Promise<void> {
  try {
    await roomService.deleteRoom(roomName);
    logger.info(`LiveKit room ended: ${roomName}`);
  } catch (error) {
    logger.error('LiveKit room end error:', error);
  }
}

export interface InterviewSession {
  interviewId: string;
  room: string;
  token: string;
  url: string;
}

export async function createInterviewSession(
  interviewId: string,
  participantName: string
): Promise<InterviewSession> {
  const room = `interview_${interviewId}`;
  const participantIdentity = `user_${interviewId}_${Date.now()}`;

  await createRoom(room);
  const token = await generateLiveKitToken({
    room,
    participantName,
    participantIdentity,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    ttl: 3600, // 1 hour
  });

  return {
    interviewId,
    room,
    token,
    url: `${config.livekit.url.replace('wss://', 'https://').replace('ws://', 'http://')}/room/${room}`,
  };
}

export function getLiveKitUrl(): string {
  return config.livekit.url;
}