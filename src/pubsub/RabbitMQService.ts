/* eslint-disable @typescript-eslint/no-explicit-any */
import amqp from 'amqplib';
import WebSocket from 'ws';
import { Call } from '../ocpp/messages.js';

export class RabbitMQService {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private clients: Map<string, WebSocket>;

  async connect(ocppClients: Map<string, WebSocket>): Promise<void> {
    this.clients = ocppClients;
    this.connection = await amqp.connect('amqp://localhost');
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
      if (this.clients.has(clientId)) {
        const ws = this.clients.get(clientId);
        ws.close();
        this.clients.delete(clientId);
        console.log(`Client ${clientId} disconnected`);
        await this.sendMessage('ocpp_responses', { action, status: 'success' });
      } else {
        await this.sendMessage('ocpp_responses', {
          action,
          status: 'error',
          message: 'Client not found',
        });
      }
    } else if (action === 'SEND_COMMAND') {
      const { clientId, command, details } = payload;
      const client = this.clients.get(clientId);
      const ws = client.ws;

      const call = new Call(details.uniqueMessageId, command, {
        idTag: clientId,
        connectorId: details?.connectorId ?? 0,
      });

      if (ws) {
        ws.send(call.toJson());
        console.log(`Command sent to client ${clientId}`);
        await this.sendMessage('ocpp_responses', { action, status: 'success' });
      } else {
        await this.sendMessage('ocpp_responses', {
          action,
          status: 'error',
          message: 'Client not found',
        });
      }
    }
  }

  async sendMessage(queue: string, message: object): Promise<void> {
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
  }
}
