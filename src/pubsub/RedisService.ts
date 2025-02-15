/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {Redis} from 'ioredis';
import dotenv from 'dotenv'
dotenv.config()

class RedisService {
  private redis: Redis;
  private pub: Redis;
  private sub: Redis;

  constructor() {
    const connectionStr = process.env.REDIS_HOST;
    this.redis = new Redis({
      host: connectionStr || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    this.pub = this.redis.duplicate(); // For publishing messages
    this.sub = this.redis.duplicate(); // For subscribing to messages

    this.redis.on('connect', () => console.log('Connected to Redis'));
    this.redis.on('error', (err) => console.error('Redis error:', err));
  }

  /** Store client info */
  async saveClientInfo(clientId: string, clientData: any) {
    await this.redis.set(`ocpp:clients:${clientId}`, JSON.stringify(clientData));
    await this.pub.publish('ocpp:client_updates', JSON.stringify({ clientId, action: 'UPDATE', clientData }));
  }

  /** Retrieve client info */
  async getClientInfo(clientId: string) {
    const data = await this.redis.get(`ocpp:clients:${clientId}`);
    return data ? JSON.parse(data) : null;
  }

  /** Remove client info on disconnection */
  async removeClient(clientId: string) {
    await this.redis.del(`ocpp:clients:${clientId}`);
    await this.pub.publish('ocpp:client_updates', JSON.stringify({ clientId, action: 'DELETE' }));
  }

  /** Get all connected clients */
  async getAllClients() {
    const keys = await this.redis.keys('ocpp:clients:*');
    const clients = await Promise.all(keys.map((key) => this.redis.get(key)));
    return clients.map((client) => JSON.parse(client));
  }

  /** Log OCPP Requests & Responses */
  async logOCPPEvent(clientId: string, eventType: 'REQUEST' | 'RESPONSE', eventData: any) {
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      data: eventData,
    };

    const key = `ocpp:events:${clientId}`;
    await this.redis.rpush(key, JSON.stringify(event)); // Append event
    await this.pub.publish('ocpp:events', JSON.stringify({ clientId, event }));
  }

  async publishEvent(channel: string, message: any): Promise<void> {
    await this.pub.publish(channel, JSON.stringify(message));
  }

  /** Subscribe to Redis Pub/Sub */
  subscribe(channel: string, callback: (message: any) => void) {
    this.sub.subscribe(channel, (err) => {
      if (err) console.error(`Error subscribing to ${channel}:`, err);
      else console.log(`Subscribed to Redis channel: ${channel}`);
    });

    this.sub.on('message', (ch, message) => {
      if (ch === channel) callback(JSON.parse(message));
    });
  }
}

export const redisService = new RedisService();
