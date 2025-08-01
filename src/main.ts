/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import express from 'express';
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
import DatabaseSyncService from './services/DatabaseSyncService.js';
import winston from 'winston';

import dotenv from 'dotenv'
dotenv.config()

// Setup logger
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'ocpp-server.log' })
  ]
});


const PORT = process.env.PORT || 8080

class OCPPServer {
  private wss: WebSocketServer;
  private routes: Map<string, RouteConfig>;
  public readonly status: 'Ready' | 'Booting' = 'Booting';
  private rabbitMQ: RabbitMQService;
  private clientSockets = new Map<string, WebSocket>(); // Store WebSocket instances in memory
  private dbSyncService: DatabaseSyncService;

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.routes = createRouteMap(routes);

    this.wss.on('connection', this.handleConnection.bind(this));
    // console.log(`OCPP Server is running on port ${port}`);
    this.status = 'Ready';

    this.rabbitMQ = new RabbitMQService(this.clientSockets);
    this.rabbitMQ.connect();
    
    // Initialize database sync service
    this.dbSyncService = new DatabaseSyncService(logger);
    this.startDatabaseSync();
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

    console.log("Before Redis await")
    // Retrieve existing client info to preserve connector data
    const existingClientInfo = await redisService.getClientInfo(clientId);
    
    // Merge existing data with new connection, preserving connectors if they exist
    const clientData = {
      clientId, // Include clientId in the data structure
      chargePointModel: existingClientInfo?.chargePointModel || '',
      chargePointVendor: existingClientInfo?.chargePointVendor || '',
      connectors: existingClientInfo?.connectors || [], // Preserve existing connectors
      lastConnected: new Date().toISOString()
    };
    
    // Save client info to Redis
    await redisService.saveClientInfo(clientId, clientData);
    const clients = await redisService.getAllClients()
    console.log(clients)

    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', () => this.handleDisconnection(clientId));
  }

  private async handleMessage(clientId: string, data: WebSocket.Data): Promise<void> {
    console.log(`Raw message from ${clientId}:`, data.toString());
    try {
      const message = unpack(data.toString());
      if (message instanceof Call) {
        await redisService.logOCPPEvent(clientId, 'REQUEST', message);
        
        // Handle specific OCPP events for database sync
        switch (message.action) {
          case 'StatusNotification':
            await this.updateConnectorStatus(clientId, message.payload, message.uniqueId);
            await this.dbSyncService.handleStatusNotification(
              clientId, 
              message.payload.status
            );
            break;
          case 'StartTransaction':
            await this.dbSyncService.handleSessionStart(
              clientId,
              message.payload.connectorId,
              message.payload
            );
            break;
          case 'StopTransaction':
            await this.dbSyncService.handleSessionStop(
              clientId,
              message.payload.connectorId || '1', // Default to connector 1 if not specified
              message.payload
            );
            break;
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
    console.log("Call function invoked. Sending CallResult")
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
  
  // Start database synchronization service
  private async startDatabaseSync(): Promise<void> {
    try {
      await this.dbSyncService.startSync();
      logger.info('✅ Database sync service started successfully');
    } catch (error) {
      logger.error('❌ Failed to start database sync service:', error);
    }
  }
  
  // Stop database synchronization service
  async stopDatabaseSync(): Promise<void> {
    try {
      await this.dbSyncService.stopSync();
      logger.info('✅ Database sync service stopped');
    } catch (error) {
      logger.error('❌ Failed to stop database sync service:', error);
    }
  }
}


// Create an Express app
const app = express();

// Define a GET route
app.get('/', async (_req, res) => {
  try {
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to GET' });
  }
});
app.get('/health', async (_req, res) => {
  try {
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to GET' });
  }
});

// Start HTTP server and WebSocket server on the same port
const server = app.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
});

const _server = new OCPPServer(server);
console.log('Server is', _server.status);
export default _server;
