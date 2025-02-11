/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import WebSocket, { WebSocketServer } from 'ws';
import {
  Call,
  CallResult,
  CallError,
  unpack,
} from './ocpp/messages.js';
import { NotImplementedError, OCPPError } from './ocpp/exceptions.js';
import { createRouteMap, RouteConfig } from './ocpp/routing.js';
import { routes } from './ocpp-routes.js';
import { RabbitMQService } from './pubsub/RabbitMQService.js';
import { redisService } from './pubsub/RedisService.js';

class OCPPServer {
  private wss: WebSocketServer;
  private routes: Map<string, RouteConfig>;
  public readonly status: 'Ready' | 'Booting' = 'Booting';
  private rabbitMQ: RabbitMQService;
  private clientSockets = new Map<string, WebSocket>(); // Store WebSocket instances in memory

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.routes = createRouteMap(routes);

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log(`OCPP Server is running on port ${port}`);
    this.status = 'Ready';

    this.rabbitMQ = new RabbitMQService(this.clientSockets);
    this.rabbitMQ.connect();
  }

  public async sendToClient(clientId: string, message: Call | CallResult | CallError): Promise<void> {
    const ws = this.clientSockets.get(clientId); // Retrieve WebSocket from memory
    if (ws?.readyState === WebSocket.OPEN) {
      const preparedMsg = message instanceof Call || message instanceof CallResult
        ? message.toJson()
        : JSON.stringify(message);
      ws.send(preparedMsg);
    } else {
      console.error(`Failed to send message: Client ${clientId} not found or disconnected`);
    }
  }

  public async broadcastMessage(message: Call | CallResult | CallError): Promise<void> {
    const clients = await redisService.getAllClients();
    clients.forEach(client => {
      const ws = this.clientSockets.get(client.id); // Retrieve WebSocket from memory
      if (ws?.readyState === WebSocket.OPEN) {
        const preparedMsg = message instanceof Call || message instanceof CallResult
          ? message.toJson()
          : JSON.stringify(message);
        ws.send(preparedMsg);
      }
    });
  }

  public async getConnectedClients() {
    return await redisService.getAllClients();
  }

  private async handleConnection(ws: WebSocket, request: any): Promise<void> {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    if (pathSegments.length < 2) {
      console.error(`Invalid connection URL: ${request.url}`);
      ws.close();
      return;
    }

    const [orgId, clientId] = pathSegments;
    
    console.log(`New client connected: orgId=${orgId}, clientId=${clientId}`);

    // Store WebSocket instance in memory
    this.clientSockets.set(clientId, ws);

    // Save client info to Redis without ws
    await redisService.saveClientInfo(clientId, { chargePointModel: '', chargePointVendor: '', connectors: [] });

    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', () => this.handleDisconnection(clientId));
  }

  private async handleMessage(clientId: string, data: WebSocket.Data): Promise<void> {
    try {
      const message = unpack(data.toString());
      if (message instanceof Call) {
        await redisService.logOCPPEvent(clientId, 'REQUEST', message);
        if (message.action === 'StatusNotification') {
          await this.updateConnectorStatus(clientId, message.payload, message.uniqueId);
        }
        await this.handleCall(clientId, message);
      } else if (message instanceof CallResult || message instanceof CallError) {
        await redisService.logOCPPEvent(clientId, 'RESPONSE', message);
      } else {
        throw new OCPPError('Unsupported message type');
      }
    } catch (error) {
      console.error(`Error handling message from client ${clientId}:`, error);
    }
  }

  private async updateConnectorStatus(clientId: string, payload: any, uniqueId: string): Promise<void> {
    const client = await redisService.getClientInfo(clientId);
    if (!client) return;

    const { connectorId, status, errorCode, timestamp } = payload;
    const connectorUpdate = { id: connectorId, status, errorCode, timestamp, uniqueMessageId: uniqueId };
    client.connectors = [...client.connectors.filter(c => c.id !== connectorId), connectorUpdate];
    await redisService.saveClientInfo(clientId, client);

    await redisService.publishEvent('ocpp:connector_status', { clientId, connectorId, status, errorCode, timestamp });
    console.log(`Connector status updated for client ${clientId}, connector ${connectorId}`);
  }

  async sendConnectedClientsToQueue() {
    const connectedClients = await redisService.getAllClients();
    await this.rabbitMQ.sendMessage('ocpp_connected_clients', { action: 'GET_CONNECTED_CLIENTS', data: connectedClients });
  }

  private async handleCall(clientId: string, call: Call): Promise<void> {
    const action = call.action;
    if (!this.routes.has(action)) {
      throw new NotImplementedError(`Action '${action}' is not implemented`);
    }

    try {
      const result = await this.routes.get(action).handler(call.payload);
      const callResult = new CallResult(call.uniqueId, result);
      await this.updateClient(clientId, call.payload);
      await this.sendConnectedClientsToQueue();
      await this.sendToClient(clientId, callResult);
    } catch (error) {
      await this.sendToClient(clientId, new CallError(call.uniqueId, 'InternalError', error.message, {}));
    }
  }

  public async updateClient(clientId: string, props: { [key: string]: any }): Promise<void> {
    const clientData = await redisService.getClientInfo(clientId);
    if (clientData) {
      await redisService.saveClientInfo(clientId, { ...clientData, ...props });
      console.log(`Updated properties for client ${clientId}`);
    } else {
      console.warn(`Client ${clientId} not found.`);
    }
  }

  private async handleDisconnection(clientId: string): Promise<void> {
    this.clientSockets.delete(clientId); // Remove WebSocket from memory
    await redisService.removeClient(clientId);
    console.log(`Client disconnected: ${clientId}`);
  }
}

const _server = new OCPPServer(8080);
console.log('Server is', _server.status);
export default _server;
