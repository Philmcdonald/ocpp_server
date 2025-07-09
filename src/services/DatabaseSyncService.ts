/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from 'winston';
import { redisService } from '../pubsub/RedisService.js';

// HTTP client for communicating with CPMS backend
class HttpClient {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.CPMS_API_URL || 'http://localhost:3000';
  }
  
  async post(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service': 'ocpp-server' // Internal service authentication
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return this.parseResponse(response);
  }
  
  async get(endpoint: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'X-Internal-Service': 'ocpp-server'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return this.parseResponse(response);
  }
  
  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      // For non-JSON responses, return the text
      const text = await response.text();
      
      // Try to parse as JSON anyway, in case content-type header is missing
      try {
        return JSON.parse(text);
      } catch {
        // If it's not valid JSON, return as text
        return { message: text };
      }
    }
  }
}

// Removed unused interfaces - using Prisma types instead


export class DatabaseSyncService {
  private logger: Logger;
  private httpClient: HttpClient;
  private syncInterval: NodeJS.Timeout | null = null;
  private orphanCheckInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private readonly SYNC_INTERVAL_MS = 60000; // 1 minute
  private readonly ORPHAN_CHECK_INTERVAL_MS = 2 * 60000; // 2 minutes
  private readonly CLEANUP_INTERVAL_MS = 60 * 60000; // 1 hour
  private readonly MAX_EVENT_AGE_HOURS = 24;
  
  private isConnected = false;
  private sessionEventMap = new Map<string, any>(); // Track session events

  constructor(logger: Logger) {
    this.logger = logger;
    this.httpClient = new HttpClient();
  }

  async startSync(): Promise<void> {
    try {
      this.logger.info('🔄 Starting database synchronization service...');
      
      // Connect to database
      await this.connect();
      
      // Immediate sync on start
      await this.performSync();
      
      // Schedule regular sync
      this.syncInterval = setInterval(async () => {
        await this.performSync();
      }, this.SYNC_INTERVAL_MS);
      
      // Schedule orphan detection
      this.orphanCheckInterval = setInterval(async () => {
        // Orphan detection logic would go here - currently simplified
        this.logger.debug('🔍 Orphan check interval - simplified implementation');
      }, this.ORPHAN_CHECK_INTERVAL_MS);
      
      // Schedule cleanup
      this.cleanupInterval = setInterval(async () => {
        await this.cleanupStaleEvents();
      }, this.CLEANUP_INTERVAL_MS);
      
      this.logger.info(`✅ Database sync service started successfully`);
      this.logger.info(`  - Sync interval: ${this.SYNC_INTERVAL_MS/1000}s`);
      this.logger.info(`  - Orphan check interval: ${this.ORPHAN_CHECK_INTERVAL_MS/1000}s`);
      this.logger.info(`  - Cleanup interval: ${this.CLEANUP_INTERVAL_MS/(1000*60)}m`);
      
    } catch (error) {
      this.logger.error('❌ Failed to start database sync service:', error);
      throw error;
    }
  }
  
  async connect(): Promise<void> {
    try {
      // Test connection to CPMS backend
      await this.httpClient.get('/api');
      this.isConnected = true;
      this.logger.info('✅ Connected to CPMS backend successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to CPMS backend:', error);
      // Don't throw - allow OCPP server to continue running
      this.isConnected = false;
    }
  }

  async stopSync(): Promise<void> {
    this.logger.info('⏹️ Stopping database sync service...');
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.orphanCheckInterval) {
      clearInterval(this.orphanCheckInterval);
      this.orphanCheckInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.isConnected) {
      this.isConnected = false;
    }
    
    this.logger.info('✅ Database sync service stopped');
  }

  private async performSync(): Promise<void> {
    try {
      this.logger.debug('🔄 Performing database sync...');
      
      if (!this.isConnected) {
        this.logger.warn('Database not connected, skipping sync');
        return;
      }
      
      await this.syncChargePointStatuses();
      // Additional sync operations can be added here
      
      this.logger.debug('✅ Database sync completed');
    } catch (error) {
      this.logger.error('❌ Database sync failed:', error);
    }
  }

  // Sync charge point statuses from OCPP events to CPMS backend
  private async syncChargePointStatuses(): Promise<void> {
    try {
      this.logger.debug('Syncing charge point statuses...');
      
      // Get all connected charge points from Redis
      const allClients = await redisService.getAllClients();
      const statusUpdates = [];
      
      for (const client of allClients) {
        if (!client.clientId) continue;
        
        // Get latest status from Redis
        const latestStatus = await redisService.getLastEventByClientAndEventName(
          client.clientId,
          'StatusNotification'
        );
        
        if (latestStatus?.data?.payload?.status) {
          const redisStatus = latestStatus.data.payload.status;
          
          // Map OCPP status to database enum
          let dbStatus: string;
          switch (redisStatus.toLowerCase()) {
            case 'available':
              dbStatus = 'AVAILABLE';
              break;
            case 'occupied':
            case 'charging':
              dbStatus = 'OCCUPIED';
              break;
            case 'faulted':
            case 'unavailable':
              dbStatus = 'OUT_OF_ORDER';
              break;
            case 'reserved':
              dbStatus = 'RESERVED';
              break;
            default:
              dbStatus = 'UNLINKED';
          }
          
          statusUpdates.push({
            chargerId: client.clientId,
            status: dbStatus,
            lastSeen: new Date().toISOString()
          });
        }
      }
      
      // Send bulk status updates to CPMS backend
      if (statusUpdates.length > 0) {
        try {
          await this.httpClient.post('/api/internal/charger-status-bulk-update', {
            updates: statusUpdates
          });
          this.logger.debug(`Updated ${statusUpdates.length} charger statuses`);
        } catch (updateError) {
          this.logger.warn(`Failed to update charger statuses: ${updateError.message}`);
        }
      }
      
    } catch (error) {
      this.logger.error('Error syncing charge point statuses:', error);
    }
  }

  // Clean up stale OCPP events from Redis
  private async cleanupStaleEvents(): Promise<void> {
    try {
      this.logger.debug('🧹 Cleaning up stale events...');
      
      // Clear events older than specified time
      await redisService.clearStaleEvents(this.MAX_EVENT_AGE_HOURS);
      
      // Find and clear events for offline chargers
      const allClients = await redisService.getAllClients();
      
      for (const client of allClients) {
        if (!client.clientId) continue;
        
        // Check if charger has been inactive
        const isActive = await redisService.isChargerActive(client.clientId, 30);
        
        if (!isActive) {
          await redisService.clearChargerEvents(client.clientId);
          
          // Notify CPMS backend about inactive charger
          if (this.isConnected) {
            try {
              await this.httpClient.post('/api/internal/status-notification', {
                chargePointId: client.clientId,
                status: 'UNLINKED',
                ocppStatus: 'inactive',
                lastSeen: new Date().toISOString()
              });
            } catch (error) {
              this.logger.warn(`Failed to notify CPMS about inactive charger: ${error.message}`);
            }
          }
        }
      }
      
      this.logger.debug('✅ Stale event cleanup completed');
      
    } catch (error) {
      this.logger.error('Error cleaning up stale events:', error);
    }
  }

  // Public method to handle session start events
  async handleSessionStart(chargePointId: string, connectorId: string, sessionData: any): Promise<void> {
    try {
      this.logger.info(`📡 Session start detected: ${chargePointId}:${connectorId}`);
      
      // Store session event for tracking
      const eventKey = `${chargePointId}:${connectorId}`;
      this.sessionEventMap.set(eventKey, {
        type: 'START',
        chargePointId,
        connectorId,
        data: sessionData,
        timestamp: new Date()
      });
      
      // Notify CPMS backend about session start
      if (this.isConnected) {
        try {
          await this.httpClient.post('/api/internal/session-start', {
            chargePointId,
            connectorId,
            sessionData,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          this.logger.warn(`Failed to notify CPMS about session start: ${error.message}`);
        }
      }
      
    } catch (error) {
      this.logger.error(`Error handling session start for ${chargePointId}:`, error);
    }
  }

  // Public method to handle session stop events
  async handleSessionStop(chargePointId: string, connectorId: string, sessionData: any): Promise<void> {
    try {
      this.logger.info(`📡 Session stop detected: ${chargePointId}:${connectorId}`);
      
      // Notify CPMS backend about session stop
      if (this.isConnected) {
        try {
          await this.httpClient.post('/api/internal/session-stop', {
            chargePointId,
            connectorId,
            sessionData,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          this.logger.warn(`Failed to notify CPMS about session stop: ${error.message}`);
        }
      }
      
      // Clear Redis events for this charger
      await redisService.clearChargerEvents(chargePointId);
      
      // Remove from session tracking
      const eventKey = `${chargePointId}:${connectorId}`;
      this.sessionEventMap.delete(eventKey);
      
      this.logger.info(`✅ Session stop processed for ${chargePointId}:${connectorId}`);
      
    } catch (error) {
      this.logger.error(`Error handling session stop for ${chargePointId}:`, error);
    }
  }

  // Public method to handle status notifications
  async handleStatusNotification(chargePointId: string, status: string): Promise<void> {
    try {
      this.logger.debug(`📡 Status notification: ${chargePointId} -> ${status}`);
      
      // Map OCPP status to database enum
      let dbStatus: string;
      switch (status.toLowerCase()) {
        case 'available':
          dbStatus = 'AVAILABLE';
          break;
        case 'occupied':
        case 'charging':
          dbStatus = 'OCCUPIED';
          break;
        case 'faulted':
        case 'unavailable':
          dbStatus = 'OUT_OF_ORDER';
          break;
        case 'reserved':
          dbStatus = 'RESERVED';
          break;
        default:
          dbStatus = 'UNLINKED';
      }
      
      // Notify CPMS backend about status change
      if (this.isConnected) {
        try {
          await this.httpClient.post('/api/internal/status-notification', {
            chargePointId,
            status: dbStatus,
            ocppStatus: status,
            lastSeen: new Date().toISOString()
          });
        } catch (error) {
          this.logger.debug(`Failed to notify CPMS about status change: ${error.message}`);
        }
      }
      
    } catch (error) {
      this.logger.error(`Error handling status notification for ${chargePointId}:`, error);
    }
  }
}

export default DatabaseSyncService;
