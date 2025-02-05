/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Import necessary modules

import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuid } from 'uuid';
import {
  Call,
  CallResult,
  CallError,
  MessageTypeId,
  unpack,
} from './ocpp/messages.js';
import { NotImplementedError, OCPPError } from './ocpp/exceptions.js';
import { createRouteMap, RouteConfig } from './ocpp/routing.js';
import { routes } from './ocpp-routes.js';
import { RabbitMQService } from './pubsub/RabbitMQService.js';

// Define Connector interface
interface Connector {
  id: number | string;
  status: string;
  errorCode: string;
  timestamp: string;
  uniqueMessageId: string; // Added uniqueId to track the specific notification
}

class OCPPServer {
  private wss: WebSocketServer;
  private clients: Map<
    string,
    {
      ws: WebSocket;
      chargePointModel: string;
      chargePointVendor: string;
      connectors: Connector[];
    }
  >;
  private routes: Map<string, RouteConfig>;
  public readonly status: 'Ready' | 'Booting' = 'Booting';
  private rabbitMQ: RabbitMQService;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.clients = new Map();
    this.routes = createRouteMap(routes);

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log(`OCPP Server is running on port ${port}`);
    this.status = 'Ready';

    this.rabbitMQ = new RabbitMQService();
    this.rabbitMQ.connect(this.clients);
  }

  // Send a message to a specific client
  public sendToClient(
    clientId: string,
    message: Call | CallResult | CallError,
  ): void {
    const client = this.clients.get(clientId);
    const ws = client.ws;

    if (ws) {
      const preparedMsg =
        message instanceof Call || message instanceof CallResult
          ? message.toJson()
          : JSON.stringify(message);
      ws.send(preparedMsg);
    } else {
      console.error(
        `Failed to send message: Client ${clientId} not found or connection closed`,
      );
    }
  }

  // Broadcast a message to all connected clients
  public broadcastMessage(message: Call | CallResult | CallError): void {
    this.clients.forEach((client) => {
      const ws = client.ws;
      if (ws.readyState === WebSocket.OPEN) {
        const preparedMsg =
          message instanceof Call || message instanceof CallResult
            ? message.toJson()
            : JSON.stringify(message);
        ws.send(preparedMsg);
      }
    });
  }

  // Get all connected clients
  public getConnectedClients(): {
    clientId: string;
    chargePointModel: string;
    chargePointVendor: string;
    connectors: Connector[];
  }[] {
    const clients = Array.from(this.clients.entries()).map(
      ([clientId, client]) => ({
        clientId,
        chargePointModel: client.chargePointModel,
        chargePointVendor: client.chargePointVendor,
        connectors: client.connectors,
      }),
    );

    return clients;
  }

  private async handleConnection(ws: WebSocket): Promise<void> {
    const clientId = uuid();
    this.clients.set(clientId, {
      ws,
      chargePointModel: '',
      chargePointVendor: '',
      connectors: [],
    });
    console.log(`New client connected: ${clientId}`);

    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', () => this.handleDisconnection(clientId));
  }

  private async handleMessage(
    clientId: string,
    data: WebSocket.Data,
  ): Promise<void> {
    try {
      const message = unpack(data.toString());

      if (message instanceof Call) {
        if (Call.messageTypeId === MessageTypeId.Call) {
          await this.handleCall(clientId, message as Call);
          const payload = {
            uniqueId: message.uniqueId,
            ...message.payload,
          };
          this.updateClient(clientId, payload);

          // Check if the call is a StatusNotification and update connectors
          if (message.action === 'StatusNotification') {
            this.updateConnectorStatus(clientId, message.payload, message.uniqueId);
          }

          this.sendConnectedClientsToQueue();
        }
      } else if (message instanceof CallResult) {
        if (CallResult.messageTypeId === MessageTypeId.CallResult) {
          console.log(`Received CALLRESULT from client ${clientId}\n`, message);
        }
      } else if (message instanceof CallError) {
        if (CallError.messageTypeId === MessageTypeId.CallError) {
          console.log(`Received CALLERROR from client ${clientId}`);
        }
      } else {
        throw new OCPPError('Unsupported message type');
      }
    } catch (error) {
      console.error(`Error handling message from client ${clientId}:`, error);
    }
  }

  // New method to update connector status
  private updateConnectorStatus(clientId: string, payload: any, uniqueId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
  
    const { 
      connectorId, 
      status, 
      errorCode, 
      timestamp,
    } = payload;
    
    // Find existing connector or create new one
    const existingConnectorIndex = client.connectors.findIndex(
      (connector) => connector.id === connectorId
    );
  
    const connectorUpdate: Connector = {
      id: connectorId,
      status,
      errorCode,
      timestamp,
      uniqueMessageId: uniqueId, // Include uniqueId in the connector object
    };
  
    if (existingConnectorIndex !== -1) {
      // Update existing connector
      client.connectors[existingConnectorIndex] = connectorUpdate;
    } else {
      // Add new connector
      client.connectors.push(connectorUpdate);
    }
  
    // Update the client in the map
    this.clients.set(clientId, client);
  }

  async sendConnectedClientsToQueue() {
    const connectedClients = this.getConnectedClients();

    await this.rabbitMQ.sendMessage('ocpp_connected_clients', {
      action: 'GET_CONNECTED_CLIENTS',
      data: connectedClients,
    });
  }

  private async handleCall(clientId: string, call: Call): Promise<void> {
    const action = call.action;

    if (!this.routes.has(action)) {
      throw new NotImplementedError(`Action '${action}' is not implemented`);
    }

    const handlerConfig = this.routes.get(action);

    try {
      const result = await handlerConfig.handler(call.payload);
      const callResult: CallResult = new CallResult(call.uniqueId, result);

      const payload = {
        uniqueId: call.uniqueId,
        ...call.payload,
      };
      this.updateClient(clientId, payload);
      this.sendConnectedClientsToQueue();

      this.sendToClient(clientId, callResult);
    } catch (error) {
      const callError: CallError = {
        uniqueId: call.uniqueId,
        errorCode: 'InternalError',
        errorDescription: error.message,
        errorDetails: {},
      } as CallError;

      this.sendToClient(clientId, callError);
    }
  }

  public updateClient(clientId: string, props: { [key: string]: any }): void {
    if (this.clients.has(clientId)) {
      // Retrieve the client data
      let clientData = this.clients.get(clientId);

      if (clientData) {
        // Update the client data
        clientData = {
          ...clientData,
          ...props,
        };

        // Update the Map with the modified data
        this.clients.set(clientId, clientData);

        // Log the update
        console.log({
          message: `Updated properties for client ${clientId}`,
          level: 'normal',
        });
      }
    } else {
      // Log if the client key does not exist
      console.warn({ message: `Client with key ${clientId} not found.` });
    }
  }

  private handleDisconnection(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  }
}

// Start the OCPP server on port 8080
const _server = new OCPPServer(8080);
console.log('Server is', _server.status);

export default _server;