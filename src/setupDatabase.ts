import mongoose from 'mongoose';
import { config } from '@root/config';
import Logger from 'bunyan';
import { redisConnection } from '@service/redis/redis.connection';

const log: Logger = config.createLogger('setupDatabase');

const connect = async () => {
  try {
    await mongoose.connect(`${config.DATABASE_URL}`);
    log.info('Successfully connected to the database.');
    redisConnection.connect();
  } catch (error) {
    log.error('Error connecting to the database:', error);
    process.exit(1);
  }
};

const setupDatabaseConnection = async () => {
  await connect();

  mongoose.connection.on('disconnected', async () => {
    console.log('Connection to the database lost. Reconnecting...');
    await connect();
  });
};

export default setupDatabaseConnection;
