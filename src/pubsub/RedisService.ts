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
    return clients.map((client, index) => {
      const parsedClient = JSON.parse(client);
      // Extract clientId from the Redis key (format: 'ocpp:clients:clientId')
      const clientId = keys[index].replace('ocpp:clients:', '');
      return { ...parsedClient, clientId };
    });
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

  /** Clear all events for a specific charger after session completion */
  async clearChargerEvents(chargerId: string): Promise<void> {
    try {
      const eventKey = `ocpp:events:${chargerId}`;
      const deleted = await this.redis.del(eventKey);
      
      if (deleted > 0) {
        console.log(`Cleared ${deleted} event logs for charger ${chargerId}`);
      }
      
      // Also clear any session context keys for this charger
      const contextKeys = await this.redis.keys(`session:context:${chargerId}:*`);
      if (contextKeys.length > 0) {
        await this.redis.del(...contextKeys);
        console.log(`Cleared ${contextKeys.length} session context keys for charger ${chargerId}`);
      }
    } catch (error) {
      console.error(`Failed to clear events for charger ${chargerId}:`, error);
    }
  }

  /** Clear events older than specified time for all chargers */
  async clearStaleEvents(maxAgeHours: number = 24): Promise<void> {
    try {
      const keys = await this.redis.keys('ocpp:events:*');
      const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      
      for (const key of keys) {
        const events = await this.redis.lrange(key, 0, -1);
        const validEvents = [];
        
        for (const eventStr of events) {
          try {
            const event = JSON.parse(eventStr);
            const eventTime = new Date(event.timestamp);
            
            if (eventTime > cutoffTime) {
              validEvents.push(eventStr);
            }
          } catch {
            // Skip malformed events
            continue;
          }
        }
        
        // Replace the list with only valid events
        await this.redis.del(key);
        if (validEvents.length > 0) {
          await this.redis.rpush(key, ...validEvents);
        }
      }
      
      console.log(`Cleared stale events older than ${maxAgeHours} hours from ${keys.length} chargers`);
    } catch (error) {
      console.error('Failed to clear stale events:', error);
    }
  }

  /** Check if charger has been active recently */
  async isChargerActive(chargerId: string, maxInactiveMinutes: number = 30): Promise<boolean> {
    try {
      const lastEvent = await this.redis.lindex(`ocpp:events:${chargerId}`, -1);
      if (!lastEvent) return false;
      
      const event = JSON.parse(lastEvent);
      const lastEventTime = new Date(event.timestamp);
      const cutoffTime = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
      
      return lastEventTime > cutoffTime;
    } catch (error) {
      console.error(`Failed to check if charger ${chargerId} is active:`, error);
      return false;
    }
  }

  /** Get events for a specific client by event name */
  async getEventsByClientAndEventName(clientId: string, eventName: string) {
    try {
      const events = await this.redis.lrange(`ocpp:events:${clientId}`, 0, -1);
      return events
        .map(event => JSON.parse(event))
        .filter(event => event.data?.action === eventName)
        .map(event => ({ ...event, clientId }));
    } catch (error) {
      console.error(`Failed to get events for ${clientId}:`, error);
      return [];
    }
  }

  /** Get last event for a specific client by event name */
  async getLastEventByClientAndEventName(clientId: string, eventName: string) {
    try {
      const events = await this.getEventsByClientAndEventName(clientId, eventName);
      return events.length > 0 ? events[events.length - 1] : null;
    } catch (error) {
      console.error(`Failed to get last event for ${clientId}:`, error);
      return null;
    }
  }
}

export const redisService = new RedisService();
