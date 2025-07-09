# OCPP Server with Database Synchronization

## Overview

This enhanced OCPP server includes real-time database synchronization capabilities that ensure consistency between OCPP events, Redis cache, and the PostgreSQL database.

## Features

### 🔄 Real-time Database Sync
- Syncs charger statuses from OCPP events to database every minute
- Validates active sessions against actual charger state
- Updates session metrics from meter values in real-time

### 🚨 Orphaned Session Detection
- Detects chargers that are charging but have no database session
- Identifies "ghost sessions" where database shows ONGOING but charger is available
- Automatic recovery and cleanup every 2 minutes

### 💰 Automatic Refund Processing
- Calculates refunds for unused energy when sessions end
- Processes wallet transactions for user refunds
- Adjusts organization payments based on actual usage

### 🧹 Redis Event Management
- Automatic cleanup of stale events older than 24 hours
- Clears all charger events after session completion
- Efficient memory management

## Setup

### 1. Install Dependencies

```bash
cd ocpp_server
npm install prisma @prisma/client
```

### 2. Database Configuration

Create a `.env` file in the OCPP server directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/vine_mobility"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Build and Run

```bash
npm run build
npm start
```

## Architecture

### DatabaseSyncService

The core service that handles all database synchronization:

- **Sync Intervals:**
  - Database sync: Every 60 seconds
  - Orphan detection: Every 2 minutes  
  - Cleanup: Every hour

- **Real-time Event Handling:**
  - `handleStatusNotification()` - Updates charger status
  - `handleSessionStart()` - Validates session starts
  - `handleSessionStop()` - Processes session completion with refunds

### Integration Points

The service integrates with OCPP message handling in `main.ts`:

```typescript
// Status notifications update database in real-time
case 'StatusNotification':
  await this.dbSyncService.handleStatusNotification(
    clientId, 
    message.payload.status, 
    message.payload.connectorId
  );
  break;

// Session events trigger validation and processing
case 'StartTransaction':
  await this.dbSyncService.handleSessionStart(
    clientId,
    message.payload.connectorId,
    message.payload
  );
  break;
```

## Monitoring

### Logs

The service provides comprehensive logging:

- **🔄 Debug:** Regular sync operations
- **📡 Info:** OCPP event processing  
- **🚨 Warn:** Orphaned sessions detected
- **❌ Error:** Failed operations
- **✅ Success:** Successful operations

### Log Files

- Console output for real-time monitoring
- `ocpp-server.log` for persistent logging

## Error Handling

### Graceful Degradation

- Database connection failures don't stop OCPP server
- Individual sync failures are logged but don't break the system
- Automatic retry mechanisms for transient errors

### Recovery Mechanisms

- **Session Recovery:** Reactivates recent sessions for orphaned chargers
- **Force Stop:** Marks problematic chargers as OUT_OF_ORDER
- **Event Cleanup:** Clears stale data to prevent memory bloat

## Business Logic

### Refund Calculation

```typescript
const actualCost = energyConsumed * pricePerKWh;
const refundAmount = Math.max(0, totalPaid - actualCost);
```

### Platform Fee Handling

- 10% platform fee calculated on actual usage only
- Organizations receive 90% of actual energy costs
- Users get refunded for unused energy

### Session States

- **ONGOING:** Active charging session
- **COMPLETED:** Normal session completion
- **TERMINATED:** Prematurely ended session
- **ORPHANED:** Charger active but no session
- **GHOST:** Session active but charger available

## API Integration

### Health Check

```bash
GET http://localhost:8080/health
```

### Connected Clients

The service maintains real-time awareness of:
- Connected chargers
- Active sessions
- Session metrics
- Charger statuses

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL in .env
   - Verify PostgreSQL is running
   - Ensure database exists

2. **Redis Connection Failed**
   - Check REDIS_HOST and REDIS_PORT
   - Verify Redis server is running

3. **Orphaned Sessions**
   - Check logs for sync service status
   - Verify OCPP events are being logged
   - Manual cleanup via database queries

### Manual Recovery

If automatic recovery fails:

```sql
-- Mark orphaned chargers as available
UPDATE "ChargePoint" 
SET status = 'AVAILABLE' 
WHERE status = 'OCCUPIED' 
AND id NOT IN (
  SELECT "chargePointId" 
  FROM "ChargeSession" 
  WHERE status = 'ONGOING'
);

-- Complete ghost sessions
UPDATE "ChargeSession" 
SET status = 'COMPLETED', 
    "endTime" = NOW(),
    "stopReason" = 'Manual cleanup'
WHERE status = 'ONGOING' 
AND "chargePointId" IN (
  SELECT id 
  FROM "ChargePoint" 
  WHERE status = 'AVAILABLE'
);
```

## Performance

### Optimizations

- Staggered sync intervals prevent resource contention
- Efficient Redis list operations
- Optimized database queries with proper includes
- Connection pooling for database operations

### Monitoring

- Track sync duration in logs
- Monitor database connection pool usage
- Watch Redis memory usage
- Alert on orphaned session counts

## Contributing

When adding new OCPP message types:

1. Add handler in `DatabaseSyncService`
2. Integrate in `main.ts` message handling
3. Add appropriate logging
4. Update this documentation

### Code Style

- Use descriptive emoji in logs (🔄, 📡, 🚨, etc.)
- Include proper error handling
- Add TypeScript types
- Write comprehensive comments
