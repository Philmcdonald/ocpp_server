import { redisService } from '../RedisService.js';

console.log('Starting Redis event listener...');

redisService.subscribe('ocpp:client_updates', (message) => {
  console.log('Client Update Event:', message);
});

redisService.subscribe('ocpp:events', (message) => {
  console.log('OCPP Event:', message);
});
