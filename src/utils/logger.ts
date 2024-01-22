import { pino } from 'pino';

const Logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export default Logger;
