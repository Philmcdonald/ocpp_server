/* eslint-disable @typescript-eslint/no-explicit-any */
import amqp from 'amqplib';
import { Call } from '../ocpp/messages.js';
import { randomUUID } from 'crypto';
import { redisService } from './RedisService.js';
import WebSocket from 'ws';

export class RabbitMQService {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private clientSockets: Map<string, WebSocket>; // Store WebSocket instances

  constructor(clientSockets: Map<string, WebSocket>) {
    this.clientSockets = clientSockets;
  }

  async connect(): Promise<void> {
    const connectionStr = process.env.AMQP_CONNECTION_STR || 'localhost';
    this.connection = await amqp.connect(connectionStr); // Include username & password
    this.channel = await this.connection.createChannel();

    console.log('RabbitMQ connected');
    this.channel.assertQueue('ocpp_commands', { durable: true });
    this.channel.assertQueue('ocpp_responses', { durable: true });

    // Listen for commands
    this.channel.consume('ocpp_commands', async (msg) => {
      if (msg) {
        const { action, payload } = JSON.parse(msg.content.toString());
        await this.handleCommand(action, payload);
        this.channel.ack(msg);
      }
    });
  }

  async handleCommand(action: string, payload: any): Promise<void> {
    if (action === 'DISCONNECT_CLIENT') {
      const { clientId } = payload;
      const ws = this.clientSockets.get(clientId);

      if (ws) {
        ws.close();
        this.clientSockets.delete(clientId); // Remove from memory
        await redisService.removeClient(clientId);
        console.log(`Client ${clientId} disconnected`);
        await this.sendMessage('ocpp_responses', { action, status: 'success' });
      } else {
        await this.sendMessage('ocpp_responses', {
          action,
          status: 'error',
          message: 'Client not found or already disconnected',
        });
      }
    } else if (action === 'SEND_COMMAND') {
      console.log("SEND_COMMAND")
      const { clientId, command, details } = payload;
      const ws = this.clientSockets.get(clientId);

      const msgId = randomUUID().replaceAll('-', '').slice(0, 7);
      const call = new Call(msgId, command, details);

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(call.toJson());
        console.log(`Command sent to client ${clientId}`);
        await this.sendMessage('ocpp_responses', { action, status: 'success' });
      } else {
        await this.sendMessage('ocpp_responses', {
          action,
          status: 'error',
          message: 'Client not connected',
        });
      }
    }
  }

  async sendMessage(queue: string, message: object): Promise<void> {
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
  }
}
